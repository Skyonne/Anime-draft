import { useCallback, useEffect, useState } from 'react';
import { characters } from '../data/catalog';
import { isComplete, newDraft, place, placeLast, turn } from '../game/engine';
import { finish, readSave, writeSave } from '../utils/storage';
import type { StatKey } from '../types';

export function useGame() {
  const [save, setSave] = useState(() => {
    const restored = readSave(characters);
    return restored.draft && isComplete(restored.draft) ? finish(restored, restored.draft, characters) : restored;
  });
  const [storageOk, setStorageOk] = useState(true);
  useEffect(() => { setStorageOk(writeSave(save)); }, [save]);
  const start = useCallback(() => {
    const draft = newDraft(characters.map(c => c.id));
    setSave(previous => ({ ...previous, draft }));
  }, []);
  const commit = useCallback((key: StatKey, expected: string) => {
    setSave(previous => {
      const draft = previous.draft;
      if (!draft || isComplete(draft) || draft.deck[turn(draft)] !== expected || draft.picks[key]) return previous;
      return finish(previous, place(draft, key, expected), characters);
    });
  }, []);
  const auto = useCallback((expected: string) => {
    setSave(previous => {
      if (!previous.draft || turn(previous.draft) !== 5 || previous.draft.deck[5] !== expected) return previous;
      return finish(previous, placeLast(previous.draft), characters);
    });
  }, []);
  const toggleMotion = () => setSave(previous => ({ ...previous, settings: { reduceMotion: !previous.settings.reduceMotion } }));
  return { save, storageOk, start, commit, auto, toggleMotion };
}
