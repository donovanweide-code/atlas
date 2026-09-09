// Reviewed tenant-specific conflict bindings; no general role or identity policy.
export const DOMAIN_CUTOVER = Object.freeze({
  "id": "SPW-DOMAIN-AUTHORITY-CUTOVER-20260909",
  "tenantId": "sport-2000-sportpaleis-bv",
  "minimumDomainRevision": 9768,
  "legacyRevision": 9657,
  "approvedBy": "user-25812f676558376d",
  "productTruthSource": "SPW-OPERATOR-ARTICLE-TRUTH-20260908-C03D860",
  "productionRecords": [
    {
      "collection": "articles",
      "id": "sp-live-137294",
      "previousSha256": "acbb02c228395f0d11c389cb81a5a8eb7f40f66e3aad639e2f3cec81fc605445",
      "targetSha256": "2d624ba099910bb4daa0ad28b852a2c6038085b39363cf9197cbb702c88f6a2b",
      "fields": [
        "profileId"
      ]
    },
    {
      "collection": "articles",
      "id": "sp-live-137295",
      "previousSha256": "72b5439c0349f15231ce0e5dc2412b18c398482391eb53186bc5f58b4e5d4d34",
      "targetSha256": "519668cb3761bd068c8a1ae595a1d74802178e4fa708345fb6a8af82dbd67bd9",
      "fields": [
        "profileId"
      ]
    },
    {
      "collection": "articles",
      "id": "sp-live-134826",
      "previousSha256": "ffb599ed37097c06ddc34a417aae28b5f831fc77000bea5813eb2740b9a17cd7",
      "targetSha256": "40a69cc2098239d9226f57d4d14dea3de35ef60cb87cf3be087f2a00c7a472be",
      "fields": [
        "profileId"
      ]
    },
    {
      "collection": "productionProfiles",
      "id": "profile-shirt",
      "previousSha256": "6f199a0c494170363af2446eaed0152741d2472283fb5e6baa053edb3730329a",
      "targetSha256": "6344dea95e38037037821ba2ada88516ede7df6c8d88750dcc6d89ee11988e51",
      "fields": [
        "sizeLabel",
        "fontProfile",
        "backNumberSizeClasses",
        "canonicalFontSourceId",
        "canonicalFontSourceAuthority"
      ]
    },
    {
      "collection": "productionProfiles",
      "id": "profile-keeper",
      "previousSha256": "673ba6bf4d93ffe43f2c610721616ba4b8fb7cfdb3b350b6f910503287e9ea2c",
      "targetSha256": "e570baf6fb5cb27b382517d2a0d0b7e925626a33fafb6d78230c0e74887f402b",
      "fields": [
        "sizeLabel",
        "backNumberSizeClasses"
      ]
    },
    {
      "collection": "productionProfiles",
      "id": "profile-shorts",
      "previousSha256": "c5ef2870b002d60b6ee322f563b26b1e94fe8c7a0bfe75b7bfc034c266fcf7c6",
      "targetSha256": "bb8934dec962b3e27bb238cca4f2795c67bec192d3a2e41942dc43919ddd15fd",
      "fields": [
        "fontProfile",
        "canonicalFontSourceId",
        "canonicalFontSourceAuthority"
      ]
    },
    {
      "collection": "productionProfiles",
      "id": "profile-shirt-home",
      "previousSha256": "b5cc7d689852795daaa24023593f59f4b649453c8865dfa44f5d7f5b9a0bae5b",
      "targetSha256": "a8dececa0f9478f01eee00fb15b8c218e0c16863c2ba763e3f73bb9e8576a582",
      "fields": [
        "sizeLabel",
        "fontProfile",
        "backNumberSizeClasses",
        "canonicalFontSourceId",
        "canonicalFontSourceAuthority"
      ]
    },
    {
      "collection": "productionProfiles",
      "id": "profile-shirt-standard",
      "previousSha256": "a515622a9a1c16d055e0d1d21c3b2da60e728e4e8e8cf892dd8a3d3082562d56",
      "targetSha256": "2be84b1969e1cbc90aa9e9fbed1e7f700a172f15963d23550da9593303e34397",
      "fields": [
        "sizeLabel",
        "backNumberSizeClasses"
      ]
    },
    {
      "collection": "productionProfiles",
      "id": "profile-shorts-home",
      "previousSha256": "c3ec65b24e7984e0f76114a4e25fd1d6540f094e4afb4b70b2f83b912e1bb6d9",
      "targetSha256": "fc1525773bf6931a2f1932c88e39d58df543934b11f30486b03e842fef3535c3",
      "fields": [
        "fontProfile",
        "canonicalFontSourceId",
        "canonicalFontSourceAuthority"
      ]
    },
    {
      "collection": "productionProfiles",
      "id": "profile-source-a-s-c-waterwijk-backNumber",
      "previousSha256": "75b2de9fb4ff2144fb9eb40f02d1c47102d8b0e6f1b8321ac04abca9d0f868de",
      "targetSha256": "acad43b9efabbbd43c31099bda3931d7c996e65bdb5721d7d0c66ca16fc1036e",
      "fields": [
        "sizeLabel",
        "backNumberSizeClasses"
      ]
    },
    {
      "collection": "productionElements",
      "id": "production-asset-907ef7665665ece5",
      "previousSha256": "f5fe201584ee83adec4b34f5464ccc7995a95cccf19187c12c717c1a0498468a",
      "targetSha256": "4463f91ef0ab2d3cae126bbf3628b4370578b8060b0ba42c30b5782410c39388",
      "fields": [
        "numberComposition"
      ]
    },
    {
      "collection": "productionElements",
      "id": "production-asset-verified-pioneers-rug-junior-160",
      "previousSha256": "b9543cd2afa76e6ba38bed39b746fe3ce1f3f6809f743c8fe2b63cf2ce5d99c6",
      "targetSha256": "06bc89c6e3573bdb1c38cf2b375103bfd228bcd8b4c4e6a3f9206ad168bbdeec",
      "fields": [
        "numberComposition"
      ]
    },
    {
      "collection": "productionElements",
      "id": "production-asset-verified-hockey-rug-200",
      "previousSha256": "0028e0e2cbeed5fee04a1ced27a739d1589dada55704bdad2683990b58413b53",
      "targetSha256": "61e4be4e710f2c9c6436735ec5e4f66fac0eee4b431017b79ddc9936598265c7",
      "fields": [
        "numberComposition"
      ]
    },
    {
      "collection": "productionElements",
      "id": "production-asset-verified-pioneers-short-80",
      "previousSha256": "a9a5f7e54b40755a1d34885b52dfee6993ac9f99eb9bac1909f13c468eac99fb",
      "targetSha256": "69248d2a3490a12e427c589d4ebe0b45a992fd593385aa396bd17b85d6371981",
      "fields": [
        "numberComposition"
      ]
    },
    {
      "collection": "productionElements",
      "id": "production-asset-verified-hockey-short-75",
      "previousSha256": "e1406199914caa5e88a1c52c3f4c94d8bf1c9fd39ed41c3b1aab45654f44860f",
      "targetSha256": "4430d384d1ef5c3637937bc31f8ee5ec6272ea566feaade60c3e7c0f65e433f2",
      "fields": [
        "numberComposition"
      ]
    },
    {
      "collection": "productionElements",
      "id": "production-asset-verified-pioneers-rug-senior-200",
      "previousSha256": "c541b70817d2b53cf9fa2806b4ea7485fa52a5be4e8c924a20be3ab248bcaf8a",
      "targetSha256": "3178492760acb06f18a00caa08d5ff5fb3be47df277f428e0badb0968a4da839",
      "fields": [
        "numberComposition"
      ]
    }
  ],
  "syncSourceFingerprint": "f02697159c325f34a2487ab04ff9ce8aadf931dc900f12ce63ace09b2fb07376",
  "syncPreviousFingerprint": "be296b3e687113d5067ce63bcbe419360ede660dd6173c0b2bd6eaf729a51e2f",
  "syncSuccessfulAt": "2026-09-09T01:08:30.191Z"
});
