#!/usr/bin/env bash
# Reset the local demo data to a fresh state before the final recording.
set -e
cd /c/Users/youssefbouz/ancestry/juthoor-local
python -I apps/database/supabase/demo/seed_demo_mock.py 2>&1 | grep -v RequestsDependencyWarning | tail -3
docker exec -i supabase_db_nextbase-oss-starter psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -A -c "update trees set is_public=false where name='عائلة المصري، فرع بيروت'; delete from auth.users where email like 'layla.haddad.%@juthoor.local' or email like 'samer.haddad.%@juthoor.local';" 
curl -s -X DELETE http://127.0.0.1:54324/api/v1/messages >/dev/null || true
echo "prep done"
