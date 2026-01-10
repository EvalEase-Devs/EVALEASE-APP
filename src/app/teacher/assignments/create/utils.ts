import { Subject } from "@/lib/types";

export function parseSubject(subjectString: string): Subject {
  const match = subjectString.match(/^(\S+)\s+(.+?)\s+\((\w+)\)$/);
  if (match) {
    const rawType = match[3];
    return {
      code: match[1],
      fullName: match[2],
      type: rawType === 'Lab' ? 'Lab' : 'Lec',
    };
  }
  return { code: "", fullName: subjectString, type: 'Lec' };
}
