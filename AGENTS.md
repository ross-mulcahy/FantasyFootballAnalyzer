# Repository release rule

When committing a change that the user asks to push to `master`, increment the app's patch version in `package.json` and `package-lock.json` as part of that change. Run `npm version patch --no-git-tag-version` before committing. Use a minor or major bump instead when the user explicitly requests one. The footer reads this package version and the Git commit SHA, so report both after pushing. Do not create a separate version-only push when the bump can be included in the feature commit.
