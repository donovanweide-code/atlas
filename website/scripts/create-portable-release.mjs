import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ZIP_LOCAL_FILE_HEADER = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const ZIP_VERSION = 20;
const ZIP_STORE_METHOD = 0;
const ZIP_DOS_TIME = 0;
const ZIP_DOS_DATE = 0x0021;
const ZIP_MAX_32_BIT = 0xffffffff;

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

async function listReleaseFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listReleaseFiles(entryPath));
    else if (entry.isFile()) files.push(entryPath);
    else throw new Error(`Niet-ondersteund release-item: ${entryPath}`);
  }
  return files;
}

function portableEntryName(sourceDirectory, filePath) {
  const relativePath = path.relative(sourceDirectory, filePath).replaceAll("\\", "/");
  if (!relativePath || relativePath.startsWith("../") || path.isAbsolute(relativePath)) {
    throw new Error(`Ongeldig releasepad: ${filePath}`);
  }
  return relativePath;
}

function assertZip32Bit(value, label) {
  if (!Number.isSafeInteger(value) || value < 0 || value > ZIP_MAX_32_BIT) {
    throw new Error(`${label} overschrijdt de ondersteunde ZIP32-grens.`);
  }
}

function buildLocalHeader({ crc, dataLength, nameLength }) {
  const header = Buffer.alloc(30);
  header.writeUInt32LE(ZIP_LOCAL_FILE_HEADER, 0);
  header.writeUInt16LE(ZIP_VERSION, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(ZIP_STORE_METHOD, 8);
  header.writeUInt16LE(ZIP_DOS_TIME, 10);
  header.writeUInt16LE(ZIP_DOS_DATE, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(dataLength, 18);
  header.writeUInt32LE(dataLength, 22);
  header.writeUInt16LE(nameLength, 26);
  header.writeUInt16LE(0, 28);
  return header;
}

function buildCentralDirectoryHeader({ crc, dataLength, nameLength, localHeaderOffset }) {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(ZIP_CENTRAL_DIRECTORY_HEADER, 0);
  header.writeUInt16LE(ZIP_VERSION, 4);
  header.writeUInt16LE(ZIP_VERSION, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(ZIP_STORE_METHOD, 10);
  header.writeUInt16LE(ZIP_DOS_TIME, 12);
  header.writeUInt16LE(ZIP_DOS_DATE, 14);
  header.writeUInt32LE(crc, 16);
  header.writeUInt32LE(dataLength, 20);
  header.writeUInt32LE(dataLength, 24);
  header.writeUInt16LE(nameLength, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(localHeaderOffset, 42);
  return header;
}

function findEndOfCentralDirectory(archive) {
  const minimumOffset = Math.max(0, archive.length - 65_557);
  for (let offset = archive.length - 22; offset >= minimumOffset; offset -= 1) {
    if (archive.readUInt32LE(offset) === ZIP_END_OF_CENTRAL_DIRECTORY) return offset;
  }
  throw new Error("ZIP mist de End of Central Directory-record.");
}

export async function createPortableRelease(sourceDirectory, outputFile) {
  const source = path.resolve(sourceDirectory);
  const output = path.resolve(outputFile);
  const sourceStats = await stat(source).catch(() => null);
  if (!sourceStats?.isDirectory()) throw new Error(`Releasebron bestaat niet: ${source}`);
  if (output.startsWith(`${source}${path.sep}`)) {
    throw new Error("Het ZIP-artefact mag niet binnen de releasebron worden geschreven.");
  }

  const files = await listReleaseFiles(source);
  if (files.length === 0) throw new Error("Releasebron bevat geen bestanden.");

  const localChunks = [];
  const centralChunks = [];
  const entries = [];
  let localOffset = 0;

  for (const file of files) {
    const name = portableEntryName(source, file);
    const nameBuffer = Buffer.from(name, "utf8");
    const data = await readFile(file);
    const checksum = crc32(data);
    assertZip32Bit(data.length, `Bestand ${name}`);
    assertZip32Bit(localOffset, `Offset ${name}`);

    const localHeader = buildLocalHeader({
      crc: checksum,
      dataLength: data.length,
      nameLength: nameBuffer.length,
    });
    const centralHeader = buildCentralDirectoryHeader({
      crc: checksum,
      dataLength: data.length,
      nameLength: nameBuffer.length,
      localHeaderOffset: localOffset,
    });

    localChunks.push(localHeader, nameBuffer, data);
    centralChunks.push(centralHeader, nameBuffer);
    entries.push({ name, bytes: data.length, crc32: checksum });
    localOffset += localHeader.length + nameBuffer.length + data.length;
  }

  assertZip32Bit(localOffset, "Central-directory-offset");
  const centralDirectory = Buffer.concat(centralChunks);
  assertZip32Bit(centralDirectory.length, "Central-directory-grootte");
  if (entries.length > 0xffff) throw new Error("Release bevat te veel bestanden voor ZIP32.");

  const end = Buffer.alloc(22);
  end.writeUInt32LE(ZIP_END_OF_CENTRAL_DIRECTORY, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  end.writeUInt16LE(0, 20);

  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, Buffer.concat([...localChunks, centralDirectory, end]));
  return { outputFile: output, entries };
}

export function inspectPortableRelease(archive) {
  const buffer = Buffer.isBuffer(archive) ? archive : Buffer.from(archive);
  const endOffset = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(endOffset + 10);
  let centralOffset = buffer.readUInt32LE(endOffset + 16);
  const entries = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(centralOffset) !== ZIP_CENTRAL_DIRECTORY_HEADER) {
      throw new Error(`Ongeldige central-directory-entry op index ${index}.`);
    }
    const method = buffer.readUInt16LE(centralOffset + 10);
    const expectedCrc = buffer.readUInt32LE(centralOffset + 16);
    const compressedSize = buffer.readUInt32LE(centralOffset + 20);
    const uncompressedSize = buffer.readUInt32LE(centralOffset + 24);
    const nameLength = buffer.readUInt16LE(centralOffset + 28);
    const extraLength = buffer.readUInt16LE(centralOffset + 30);
    const commentLength = buffer.readUInt16LE(centralOffset + 32);
    const localHeaderOffset = buffer.readUInt32LE(centralOffset + 42);
    const nameStart = centralOffset + 46;
    const name = buffer.subarray(nameStart, nameStart + nameLength).toString("utf8");

    if (method !== ZIP_STORE_METHOD || compressedSize !== uncompressedSize) {
      throw new Error(`ZIP-entry ${name} gebruikt een niet-ondersteunde compressiemethode.`);
    }
    if (buffer.readUInt32LE(localHeaderOffset) !== ZIP_LOCAL_FILE_HEADER) {
      throw new Error(`ZIP-entry ${name} mist een geldige local-file-header.`);
    }
    const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const content = buffer.subarray(dataStart, dataStart + compressedSize);
    if (crc32(content) !== expectedCrc) throw new Error(`ZIP-entry ${name} faalt CRC-validatie.`);

    entries.push({ name, bytes: uncompressedSize, crc32: expectedCrc, content });
    centralOffset = nameStart + nameLength + extraLength + commentLength;
  }

  return entries;
}

const executedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (executedDirectly) {
  const outputFile = process.argv[2];
  const sourceDirectory = process.argv[3]
    ?? fileURLToPath(new URL("../dist", import.meta.url));
  if (!outputFile) {
    console.error("Gebruik: node scripts/create-portable-release.mjs <output.zip> [dist-map]");
    process.exitCode = 1;
  } else {
    try {
      const result = await createPortableRelease(sourceDirectory, outputFile);
      console.log(`Portable release gemaakt: ${result.outputFile} (${result.entries.length} bestanden).`);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  }
}
