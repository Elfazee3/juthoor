import { NextRequest, NextResponse } from 'next/server';

import { importGedcomSnapshot } from '@/lib/gedcom/importPipeline';
import { parseGedcom } from '@/lib/gedcom/parse';
import {
  newTreeName,
  readGedcomUpload,
  UploadError,
} from '@/lib/gedcom/readUpload';
import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';

// ============================================================================
// POST — upload a .ged file from another platform and import it as a NEW tree.
//
// Any signed-in Registered User can do this. The importer becomes the new
// tree's IFT Administrator (`trees.owner_id`), exactly as for a tree built from
// scratch in Juthoor, and the tree starts private. The living people in it are
// masked by the same rules as in any other tree (decision D5): only this
// IFT Administrator can export their details.
// ============================================================================
export async function POST(req: NextRequest) {
  try {
    const supabase = await createJuthoorSupabaseClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub ?? null;
    if (!userId) {
      return NextResponse.json(
        { error: 'Sign in to import a tree' },
        { status: 401 }
      );
    }

    // Read and parse first, so a bad file never leaves an empty tree behind.
    const upload = await readGedcomUpload(req);
    const snapshot = parseGedcom(upload.text);
    if (snapshot.persons.length === 0) {
      return NextResponse.json(
        { error: 'The file contains no people' },
        { status: 422 }
      );
    }

    const { data: tree, error: treeError } = await supabase
      .from('trees')
      .insert({
        name: newTreeName(upload, 'شجرة مستوردة'), // "Imported tree"
        owner_id: userId,
        is_public: false,
      })
      .select('id')
      .single();
    if (treeError || !tree) {
      throw new Error(treeError?.message ?? 'Could not create the tree');
    }

    try {
      const summary = await importGedcomSnapshot(supabase, tree.id, snapshot);
      if (summary.personsInserted === 0) {
        throw new Error(summary.errors[0] ?? 'No people could be imported');
      }
      return NextResponse.json(summary, { status: 200 });
    } catch (importError) {
      // Do not keep a half-made tree: the owner can delete it, and cascades clean up.
      await supabase.from('trees').delete().eq('id', tree.id);
      throw importError;
    }
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Import failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
