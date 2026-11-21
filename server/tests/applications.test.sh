#!/usr/bin/env bash
# Integration tests for POST /api/applications.
# Needs: server running, migration applied, mysql client, server/.env.
# Uses dummy data only.
set -u

BASE_URL="${BASE_URL:-http://localhost:3000}"
API="$BASE_URL/api/applications"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if [ -f "$ROOT/server/.env" ]; then set -a; . "$ROOT/server/.env"; set +a; fi
UPLOAD_ROOT="${UPLOAD_DIR:-$ROOT/uploads}"

db() { MYSQL_PWD="${DB_PASSWORD:-}" mysql -u "$DB_USER" -h "${DB_HOST:-localhost}" "$DB_NAME" -N -B -e "$1"; }
b64dec() { base64 -D 2>/dev/null || base64 -d; }

TMP="$(mktemp -d)"
RESULTS="$TMP/results"; : > "$RESULTS"

cleanup() {
  rm -rf "$TMP"
}
trap cleanup EXIT

# ---------- fixtures ----------
PNG_B64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
printf '%%PDF-1.4\n%%%%EOF\n' > "$TMP/resume.pdf"
printf '%s' "$PNG_B64" | b64dec > "$TMP/id.png"
printf 'plain text pretending to be a pdf\n' > "$TMP/fake.pdf"
printf 'MZ not a document\n' > "$TMP/malware.exe"
{ printf '%%PDF-1.4\n'; head -c 6000000 /dev/zero; } > "$TMP/big.pdf"

# ---------- default (valid) payload ----------
EMAIL="test.$(date +%s)@example.com"
fullName="Test Applicant"; email="$EMAIL"; mobile="+63 900 000 0000"
position="field-technician"; message="Dummy cover note."
resume_file="$TMP/resume.pdf";   resume_type="application/pdf"
citizenship_file="$TMP/id.png";  citizenship_type="image/png"

add_field() { [ -n "$2" ] && ARGS+=(--form-string "$1=$2"); return 0; }
add_file()  { [ -n "$2" ] && ARGS+=(-F "$1=@$2;type=$3"); return 0; }

build_args() {
  ARGS=()
  add_field fullName "$fullName";         add_field email "$email"
  add_field mobile "$mobile";             add_field position "$position"
  add_field message "$message"
  add_file resume "$resume_file" "$resume_type"
  add_file citizenship "$citizenship_file" "$citizenship_type"
}

record() { # label expected actual [body-file]
  if [ "$2" = "$3" ]; then
    echo "PASS  $1 (HTTP $3)"; echo PASS >> "$RESULTS"
  else
    echo "FAIL  $1 (expected $2, got $3)"; echo FAIL >> "$RESULTS"
    [ -n "${4:-}" ] && [ -f "$4" ] && echo "      body: $(cat "$4")"
  fi
}

run_case() { # expected_status label
  build_args
  local status
  status=$(curl -s -o "$TMP/response.json" -w '%{http_code}' -X POST "$API" "${ARGS[@]}")
  record "$2" "$1" "$status" "$TMP/response.json"
}

count_files() { find "$UPLOAD_ROOT" -type f 2>/dev/null | wc -l | tr -d ' '; }

# ---------- preflight ----------
status=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/apply.html")
if [ "$status" != "200" ]; then
  echo "Server not reachable (HTTP $status). Run: npm start"; exit 2
fi

rows_before=$(db "SELECT COUNT(*) FROM applications")
files_before=$(count_files)

echo "== Success =="
( run_case 201 "valid submission" )

echo "== Invalid fields =="
( fullName="";                  run_case 400 "missing full name" )
( email="not-an-email";         run_case 400 "invalid email" )
( position="ceo";               run_case 400 "invalid position" )

echo "== Invalid files =="
( resume_file="$TMP/malware.exe"; resume_type="application/pdf"; run_case 400 "unsupported extension" )
( resume_type="text/plain";     run_case 400 "incorrect MIME type" )
( resume_file="$TMP/fake.pdf";  run_case 400 "fake file signature" )
( resume_file="$TMP/big.pdf";   run_case 400 "oversized upload (>5 MB)" )
( citizenship_file="";          run_case 400 "missing citizenship proof" )

echo "== Database / filesystem verification =="
rows_after=$(db "SELECT COUNT(*) FROM applications")
files_after=$(count_files)
record "exactly 1 row inserted" "1" "$((rows_after - rows_before))"
record "row has test email" "1" "$(db "SELECT COUNT(*) FROM applications WHERE email='$EMAIL'")"
record "exactly 2 files kept (no orphans)" "2" "$((files_after - files_before))"

passed=$(grep -c PASS "$RESULTS"); failed=$(grep -c FAIL "$RESULTS")
echo "----------------------------------------"
echo "Passed: $passed   Failed: $failed"
[ "$failed" -eq 0 ]