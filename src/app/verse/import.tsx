import { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useVerseStore } from '@/store';
import { pickTextFile } from '@/services/filePicker';
import { parseVerseTextFile, planTextImport, type TextImportPlan } from '@/utils/textImport';
import { TRANSLATIONS } from '@/types';

/**
 * Bulk-add verses from a plain text file or a paste (issue #15).
 *
 * The screen's one real job is that nothing is written until the user has seen
 * what will be written. Parsing is pure (`src/utils/textImport.ts`) and runs on
 * every keystroke, so the summary below the box is always the file as the
 * importer reads it -- including the lines it can't read and the verses it
 * would skip as duplicates. Both are fixable in the box itself, which is why
 * the picked file lands in an editable field rather than being imported
 * straight from disk.
 */

/** How many entries of each kind to list before summarizing the rest. */
const PREVIEW_LIMIT = 5;

export default function ImportVersesScreen() {
  const router = useRouter();
  const { verses, shelves, activeShelfId, addVerses } = useVerseStore();

  const [raw, setRaw] = useState('');
  const [translation, setTranslation] = useState<string>('NIV');
  // Imported verses land on the active shelf by default -- it is the set the
  // user is currently working in -- but any shelf can be picked instead.
  const [shelfId, setShelfId] = useState<string | null>(activeShelfId);
  const [isPicking, setIsPicking] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<number | null>(null);

  const plan: TextImportPlan = useMemo(
    () => planTextImport(parseVerseTextFile(raw), verses, translation),
    [raw, verses, translation]
  );

  const handleChoose = async () => {
    setError(null);
    setIsPicking(true);
    try {
      const contents = await pickTextFile({ mimeType: 'text/plain', accept: '.txt,.md,text/plain' });
      // null means the user cancelled the picker; leave whatever is in the box.
      if (contents !== null) {
        setRaw(contents);
        setImported(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that file.');
    } finally {
      setIsPicking(false);
    }
  };

  const handleImport = async () => {
    setError(null);
    setIsImporting(true);
    try {
      const added = await addVerses(
        plan.toImport.map(({ reference, text }) => ({ reference, text })),
        translation,
        shelfId
      );
      setImported(added.length);
      setRaw('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to import verses.');
    } finally {
      setIsImporting(false);
    }
  };

  const done = () => {
    // On web there is often no back-stack entry to pop, which dumps the user at
    // the root instead of the list they came from (same reason as verse/add).
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/verses');
    }
  };

  const shelfName = shelves.find((s) => s.id === shelfId)?.name;

  if (imported !== null) {
    return (
      <ScrollView className="flex-1 bg-white">
        <View className="p-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">Import complete</Text>
          <Text className="text-gray-600 mb-6">
            {imported === 1 ? '1 verse was added' : `${imported} verses were added`}
            {shelfName ? ` to ${shelfName}` : ''} in {translation}.
          </Text>
          <TouchableOpacity onPress={done} className="bg-blue-500 py-3 rounded-lg mb-3">
            <Text className="text-white text-center font-semibold">Back to My Verses</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setImported(null)}
            className="border border-gray-300 py-3 rounded-lg"
          >
            <Text className="text-gray-700 text-center font-semibold">Import another file</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white" keyboardShouldPersistTaps="handled">
      <View className="p-6">
        <Text className="text-2xl font-bold text-gray-900 mb-2">Import Verses</Text>
        <Text className="text-gray-600 mb-6">
          Add a list of verses at once. This adds the verses only — no practice history — so it is
          not the same as Settings → Import, which restores a full backup.
        </Text>

        {/* Format help */}
        <View className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <Text className="text-sm font-semibold text-gray-700 mb-2">One verse per line</Text>
          <Text className="text-sm text-gray-600 font-mono mb-3">
            John 3:16 - For God so loved the world{'\n'}Psalm 23:1 - The LORD is my shepherd
          </Text>
          <Text className="text-xs text-gray-500">
            A tab, a pipe, or a dash separates the reference from the verse. A long verse can run
            onto the next lines. Or put the reference on its own line with the verse underneath and
            a blank line between verses. Lines starting with # are ignored.
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleChoose}
          disabled={isPicking}
          className={`py-3 rounded-lg mb-4 ${isPicking ? 'bg-blue-300' : 'bg-blue-500'}`}
        >
          <Text className="text-white text-center font-semibold">
            {isPicking ? 'Opening…' : 'Choose a text file'}
          </Text>
        </TouchableOpacity>

        <Text className="text-sm font-medium text-gray-700 mb-2">…or paste your list here</Text>
        <TextInput
          value={raw}
          onChangeText={(text) => {
            setRaw(text);
            setImported(null);
          }}
          placeholder={'John 3:16 - For God so loved the world…'}
          multiline
          textAlignVertical="top"
          className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 mb-4 h-40"
        />

        {/* Translation applies to the whole import: one file, one translation. */}
        <Text className="text-sm font-medium text-gray-700 mb-2">Translation</Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {TRANSLATIONS.map((trans) => (
            <TouchableOpacity
              key={trans}
              onPress={() => setTranslation(trans)}
              className={`px-4 py-2 rounded-full border ${
                translation === trans ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  translation === trans ? 'text-white' : 'text-gray-700'
                }`}
              >
                {trans}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {shelves.length > 0 && (
          <>
            <Text className="text-sm font-medium text-gray-700 mb-2">Shelf</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              <TouchableOpacity
                onPress={() => setShelfId(null)}
                className={`px-4 py-2 rounded-full border ${
                  shelfId === null ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    shelfId === null ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  No shelf
                </Text>
              </TouchableOpacity>
              {shelves.map((shelf) => (
                <TouchableOpacity
                  key={shelf.id}
                  onPress={() => setShelfId(shelf.id)}
                  className={`px-4 py-2 rounded-full border ${
                    shelfId === shelf.id ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      shelfId === shelf.id ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {shelf.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {raw.trim().length > 0 && <ImportPreview plan={plan} translation={translation} />}

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <Text className="text-red-700">{error}</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleImport}
          disabled={isImporting || plan.toImport.length === 0}
          className={`py-3 rounded-lg mb-3 ${
            isImporting || plan.toImport.length === 0 ? 'bg-gray-300' : 'bg-green-600'
          }`}
        >
          {isImporting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white text-center font-semibold">
              {plan.toImport.length === 0
                ? 'Nothing to import yet'
                : `Import ${plan.toImport.length} ${plan.toImport.length === 1 ? 'verse' : 'verses'}`}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={done} className="py-3 rounded-lg border border-gray-300">
          <Text className="text-gray-700 text-center font-semibold">Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

/**
 * What this file would do if imported: the verses that will be added, the
 * duplicates that will be skipped, and the lines that could not be read.
 *
 * Collapsed it shows the first few of each; expanded it shows every row in
 * full, with no truncation. The expansion is not a nicety (PR #52 review): the
 * preview is what stands behind the parser's one heuristic -- whether a line
 * mid-entry starts a new verse -- and a preview that stops at five rows cannot
 * catch a misparse on row six, or show the line number of the ninth problem.
 */
function ImportPreview({ plan, translation }: { plan: TextImportPlan; translation: string }) {
  const { toImport, skipped, problems } = plan;
  const [showAll, setShowAll] = useState(false);

  const total = toImport.length + skipped.length + problems.length;
  const hidden =
    Math.max(0, toImport.length - PREVIEW_LIMIT) +
    Math.max(0, skipped.length - PREVIEW_LIMIT) +
    Math.max(0, problems.length - PREVIEW_LIMIT);

  const visible = <T,>(rows: T[]): T[] => (showAll ? rows : rows.slice(0, PREVIEW_LIMIT));

  return (
    <View className="mb-4">
      <View className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm font-semibold text-gray-700 flex-1 pr-2">
            {toImport.length} to add
            {skipped.length > 0
              ? ` · ${skipped.length} duplicate${skipped.length === 1 ? '' : 's'} skipped`
              : ''}
            {problems.length > 0 ? ` · ${problems.length} couldn't be read` : ''}
          </Text>
          {(hidden > 0 || showAll) && (
            <TouchableOpacity onPress={() => setShowAll(!showAll)}>
              <Text className="text-sm font-semibold text-blue-600">
                {showAll ? 'Show less' : `Review all ${total}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {visible(toImport).map((entry) => (
          <View key={`add-${entry.line}`} className={showAll ? 'mb-2' : undefined}>
            <Text className="text-sm text-gray-600" numberOfLines={showAll ? undefined : 1}>
              <Text className="font-medium text-gray-800">{entry.reference}</Text> — {entry.text}
            </Text>
          </View>
        ))}
        {!showAll && toImport.length > PREVIEW_LIMIT && (
          <Text className="text-sm text-gray-500 mt-1">
            …and {toImport.length - PREVIEW_LIMIT} more, hidden
          </Text>
        )}
      </View>

      {skipped.length > 0 && (
        <View className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-3">
          <Text className="text-sm font-semibold text-amber-800 mb-2">
            Skipped as duplicates ({translation})
          </Text>
          {visible(skipped).map(({ entry, reason }) => (
            <Text
              key={`skip-${entry.line}`}
              className="text-sm text-amber-700"
              numberOfLines={showAll ? undefined : 1}
            >
              Line {entry.line}: {entry.reference}
              {reason === 'duplicate-in-file' ? ' (repeated in this file)' : ' (already saved)'}
            </Text>
          ))}
          {!showAll && skipped.length > PREVIEW_LIMIT && (
            <Text className="text-sm text-amber-600 mt-1">
              …and {skipped.length - PREVIEW_LIMIT} more, hidden
            </Text>
          )}
        </View>
      )}

      {problems.length > 0 && (
        <View className="bg-red-50 border border-red-200 rounded-lg p-4 mt-3">
          <Text className="text-sm font-semibold text-red-800 mb-2">
            Couldn&apos;t be read — these lines will be left out
          </Text>
          {visible(problems).map((problem) => (
            <View key={`problem-${problem.line}`} className="mb-2">
              <Text className="text-sm text-red-700" numberOfLines={showAll ? undefined : 1}>
                Line {problem.line}: {problem.excerpt}
              </Text>
              <Text className="text-xs text-red-600">{problem.message}</Text>
            </View>
          ))}
          {!showAll && problems.length > PREVIEW_LIMIT && (
            <Text className="text-sm text-red-600">
              …and {problems.length - PREVIEW_LIMIT} more, hidden
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
