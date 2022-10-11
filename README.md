# Upload Captain Artifact

This action uploads test results to [Captain](https://captain.build/).

Captain is a build and test suite performance management platform.

You'll need a [Captain API Token](https://www.rwx.com/captain/docs/api-tokens) to use this Action.

## Usage

```yaml
- uses: rwx-research/upload-captain-artifact@v1
  if: always()
  continue-on-error: true
  with:
    # Required.
    # name: how the artifact will be shown in captain
    # path: path to test result. This field supports bash globbing (e.g. **/*).
    # kind: for now, this should always be "test_results"
    # parser: one of
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
    # https://www.rwx.com/captain/docs/api-tokens
    captain-token: ''

    # This is required if you set the `name` property on your job.
    # If you provided a name, set that same value here.
    job-name: ''

    # Optional.
    # The behavior of the action when an artifact's file is not found.
    #
    #  Options:
    #    - ignore: Output neither a warning nor an error; the action will succeed.
    #    - warn (default): Output a warning; the action will succeed.
    #    - error: Output an error; the action will fail.
    if-files-not-found: ''
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
    captain-token: '${{ secrets.CAPTAIN_API_TOKEN }}'
```

You should configure the build step to run even if the test suite fails by adding `if: always()`.
This will enable Captain to provide functionality related to test failures, such as identifying flaky tests.

We also recommend setting `continue-on-error: true` so that any errors uploading artifacts will not cause your entire build to fail.
