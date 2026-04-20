# Test Results

This file records the latest known status of the project test coverage.

## Latest Run

- Date: 2026-04-20
- Command: `cd Backend && npm test`
- Status: PASS

## Pass Logs

| Test | File | Result | Notes |
| --- | --- | --- |
| Backend token hashing | [`Backend/automated-tests/hashToken.test.js`](Backend/automated-tests/hashToken.test.js) | PASS | Hash output and format checks succeeded. |
| Backend cookie parsing | [`Backend/automated-tests/cookieParser.test.js`](Backend/automated-tests/cookieParser.test.js) | PASS | Cookie parsing and decoding checks succeeded. |
| Backend JWT generation | [`Backend/automated-tests/generateToken.test.js`](Backend/automated-tests/generateToken.test.js) | PASS | Access and refresh token signing checks succeeded. |
| Backend auth cookie helpers | [`Backend/automated-tests/authCookies.test.js`](Backend/automated-tests/authCookies.test.js) | PASS | Cookie contract checks succeeded. |
| Backend request validation | [`Backend/automated-tests/validateRequest.test.js`](Backend/automated-tests/validateRequest.test.js) | PASS | Validation parsing and error formatting checks succeeded. |
| Backend refresh controller | [`Backend/automated-tests/refreshController.test.js`](Backend/automated-tests/refreshController.test.js) | PASS | Missing-token, success, and invalid-token paths succeeded. |
| Backend auth middleware | [`Backend/automated-tests/authMiddleware.test.js`](Backend/automated-tests/authMiddleware.test.js) | PASS | Missing-token, invalid-token, missing-user, and valid-user paths succeeded. |
| Backend CSRF protection | [`Backend/automated-tests/csrfProtection.test.js`](Backend/automated-tests/csrfProtection.test.js) | PASS | Safe method, exemption, match, and mismatch paths succeeded. |

## Fail Logs

| Test | File | Result | Error |
| --- | --- | --- | --- |
| None in latest run | - | - | No failures were reported by `npm test` on 2026-04-20. |

Update the pass and fail rows after each test run so individual test outcomes stay visible in one place.