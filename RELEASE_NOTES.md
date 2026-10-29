# claim-review v0.3.2

GitHub publication completed; npm publication remains pending.

v0.3.2 is tagged at `6759ad71231f2e1b59ed8b5913ffad6dfd547970` and its
[GitHub Release](https://github.com/alawein/siftgrain-cite/releases/tag/v0.3.2)
is public. [Canonical run 37828847596](https://github.com/alawein/siftgrain-cite/actions/runs/37828847596)
passed 96 unit tests, 10 Python tests, 48 browser cases, build and hosted
provenance checks. Its corrected absolute tarball path reached npm authentication
and failed with `ENEEDAUTH`; npm publication remains unverified.
[Pages run 37828847613](https://github.com/alawein/siftgrain-cite/actions/runs/37828847613)
succeeded at that revision. Owner CLI authentication remains blocked with E401
pending human web login/OTP and trusted publisher setup.

This maintenance release corrects the npm tarball
argument to an absolute local path. npm 12.2.0 interpreted the prior relative
slash-only argument as GitHub shorthand and failed with EALLOWGIT.

v0.3.1 remains an immutable GitHub Release with successful hosted build,
94 unit tests, 48 browser cases, schema validation and artifact attestations.
Its failed npm attempt is not registry publication evidence. v0.3.2 preserves
runtime, offline HTML, interoperability and study behavior. Independent human
study labels remain pending. Owner web login/trusted publisher setup remain
external prerequisites. See [release readiness](RELEASE_READY.md).
