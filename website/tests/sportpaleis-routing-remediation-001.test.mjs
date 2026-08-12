import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("dedicated Sportpaleis Nginx-host proxy't korte routes naar dezelfde begrensde runtime", async () => {
  const nginx = await readFile(new URL("../../ops/production/nginx-workspace-sportpaleis-predeployment.conf", import.meta.url), "utf8");
  assert.match(nginx, /location \/ \{\s*proxy_pass http:\/\/wbd_workspace_runtime;\s*include \/etc\/nginx\/proxy_params;\s*\}/u);
  assert.doesNotMatch(nginx, /location \/ \{\s*return 404;/u);
  assert.match(nginx, /location \/api\/ \{[\s\S]*client_max_body_size 8m;/u);
  assert.match(nginx, /X-Robots-Tag "noindex, nofollow, noarchive"/u);
});
