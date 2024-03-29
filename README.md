# Upload Captain Artifact

⚠️  This Action is deprecated. ⚠️

See the latest documentation at https://www.rwx.com/captain/docs/test-suite-integration

## Deprecated Documentation

This action uploads test results to [Captain](https://rwx.com/captain).

Captain provides observability and tooling compatible with your existing CI platform and testing frameworks.
Use it for faster and more reliable builds, and happier and more productive engineers.

You'll need an [Access Token](https://account.rwx.com/deep_link/manage/access_tokens) to use this Action. Set it as a secret
in your repo. Conventionally, we call this secret `RWX_ACCESS_TOKEN`. More documentation on access
tokens [here](https://www.rwx.com/docs/access-tokens).

## Configure Test Framework

Before you can upload your test results, you'll need to configure your test framework to write the test results to a file.
Here's the documentation for how to configure reporters in several of the most popular testing frameworks.
We're working on building support for additional frameworks.
If you'd like us to prioritize any one in particular, please [let us know](https://www.rwx.com/support).

- [Cypress](https://github.com/captain-examples/cypress)
- [Jest](https://github.com/captain-examples/jest)
- [JUnit with Maven](https://github.com/captain-examples/junit5)
- [pytest](https://github.com/captain-examples/pytest)
- [RSpec](https://github.com/captain-examples/RSpec)
- [xUnit](https://github.com/captain-examples/xunit2)


## Usage

Once you have your test framework configured to write its test results to a file, you're ready to upload them into Captain.

```yaml
- uses: rwx-research/upload-captain-artifact@v1

  # You should configure the build step to run even if the test suite fails by adding `if: always()`.
  # This will enable Captain to provide functionality related to test failures, such as identifying flaky tests.
  if: always()

  # We also recommend setting `continue-on-error: true` so that any errors uploading test results
  # will not cause your entire build to fail.
  continue-on-error: true

  with:
    # Required.
    # this is a json array of objects with fields...
    # - name: how the artifact will be shown in captain
    # - path: path to test result. This field supports bash globbing (e.g. **/*).
    # - kind: for now, this should always be "test_results"
    # - parser: one of
    #   - cypress_junit_xml
    #   - jest_json
    #   - junit_xml
    #   - rspec_json
    #   - xunit_dot_net_xml
    artifacts: |
      [
        {
          "name": "",
          "path": ""
          "kind": "test_results",
          "parser": ""
        }
      ]

    # Required.
    # https://www.rwx.com/docs/access-tokens
    captain-token: '${{ secrets.RWX_ACCESS_TOKEN }}'

    # This is required if you set the `name` property on your job.
    # If you provided a name, set that same value here.
    job-name: ''

    # This is required if you are running the action as part of a matrix build.
    # Without it, we won't be able to find the job to associate your artifacts.
    # If you're not sure, you can always safely set this even if you aren't using a matrix.
    job-matrix: '${{ toJSON(matrix) }}'
```

## Example

```yaml
- name: Upload test results to Captain
  uses: rwx-research/upload-captain-artifact@v1
  if: always()
  continue-on-error: true
  with:
    artifacts: |
      [
        {
          "name": "RSpec",
          "path": "tmp/**/rspec.json",
          "kind": "test_results",
          "parser": "rspec_json"
        }
      ]
    captain-token: '${{ secrets.RWX_ACCESS_TOKEN }}'
```
