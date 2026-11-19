import { describe, expect, it } from 'vitest';
import classesJson from '../../data/classes.json';
import { changeMountedState, getClassDefinition } from '../../src/core/class/classRules';
import { initialChapterData, type ExtendedUnitState } from '../../src/core/data/chapterData';

describe('dismount for every mounted class (PLAN item 129)', () => {
  it('every class with a mountKind can dismount and remount', () => {
    const mounted = (classesJson.classes as { id: string; mountKind?: string }[])
      .filter((c) => c.mountKind);
    expect(mounted.length).toBeGreaterThan(0);
    const base = structuredClone(initialChapterData.units[0]!) as ExtendedUnitState;
    for (const cls of mounted) {
      const entry: ExtendedUnitState = {
        ...structuredClone(base),
        unit: { ...base.unit, classId: cls.id, mountedClassId: undefined },
      };
      const dismounted = changeMountedState(entry, false);
      expect(dismounted, `${cls.id} should dismount`).not.toBeNull();
      expect(dismounted!.unit.moveType).toBe('foot');
      expect(dismounted!.unit.mountedClassId).toBe(cls.id);
      const remounted = changeMountedState(dismounted!, true);
      expect(remounted, `${cls.id} should remount`).not.toBeNull();
      expect(remounted!.unit.classId).toBe(cls.id);
    }
  });

  it('fliers dismount to the dismounted pegasus form', () => {
    const base = structuredClone(initialChapterData.units[0]!) as ExtendedUnitState;
    const entry: ExtendedUnitState = {
      ...base,
      unit: { ...base.unit, classId: 'pegasus_knight', mountedClassId: undefined },
    };
    const dismounted = changeMountedState(entry, false);
    expect(dismounted!.unit.classId).toBe('dismounted_pegasus');
    expect(getClassDefinition('dismounted_pegasus')?.tier).toBe('dismounted');
  });
});
