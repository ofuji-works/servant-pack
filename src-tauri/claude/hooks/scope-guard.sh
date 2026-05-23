#!/usr/bin/env bash
set -euo pipefail

input=$(cat)
path=$(echo "$input" | jq -r '.tool_input.file_path // .tool_input.notebook_path // .tool_input.path // empty')

if [ -z "$path" ]; then
  exit 0
fi

path="${path/#\~/$HOME}"

case "$path" in
  /*) abs="$path" ;;
  *)  abs="$PWD/$path" ;;
esac

abs=$(readlink -m -- "$abs")

allowed="$HOME/.servantpack"
if [[ "$abs" != "$allowed" && "$abs" != "$allowed"/* ]]; then
  jq -n --arg reason "out of ~/.servantpack scope: $abs" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
fi
exit 0
