export const SUBJECTS_DATA = {
  "SEM 5": [
    {
      "code": "CSC501",
      "fullName": "TCS",
      "type": "Lec"
    },
    {
      "code": "CSC502",
      "fullName": "SE",
      "type": "Lec"
    },
    {
      "code": "CSC503",
      "fullName": "CN",
      "type": "Lec"
    },
    {
      "code": "CSC504",
      "fullName": "DWM",
      "type": "Lec"
    },
    {
      "code": "CSL501",
      "fullName": "SE Lab",
      "type": "Lab"
    },
    {
      "code": "CSL502",
      "fullName": "CN Lab",
      "type": "Lab"
    },
    {
      "code": "CSL503",
      "fullName": "DWM Lab",
      "type": "Lab"
    },
    {
      "code": "CSL504",
      "fullName": "PCE-II",
      "type": "Lab"
    }
  ],
  "SEM 6": [
    {
      "code": "CSC601",
      "fullName": "SPCC",
      "type": "Lec"
    },
    {
      "code": "CSC602",
      "fullName": "CSS",
      "type": "Lec"
    },
    {
      "code": "CSC603",
      "fullName": "MC",
      "type": "Lec"
    },
    {
      "code": "CSC604",
      "fullName": "AI",
      "type": "Lec"
    },
    {
      "code": "CSL601",
      "fullName": "SPCC Lab",
      "type": "Lab"
    },
    {
      "code": "CSL602",
      "fullName": "CSS Lab",
      "type": "Lab"
    },
    {
      "code": "CSL603",
      "fullName": "MC Lab",
      "type": "Lab"
    },
    {
      "code": "CSL604",
      "fullName": "AI Lab",
      "type": "Lab"
    }
  ],
  "SEM 7": [
    {
      "code": "CSC701",
      "fullName": "ML",
      "type": "Lec"
    },
    {
      "code": "CSC702",
      "fullName": "BDA",
      "type": "Lec"
    },
    {
      "code": "CSDC7013",
      "fullName": "NLP",
      "type": "Lec"
    },
    {
      "code": "CSDC7022",
      "fullName": "Blockchain",
      "type": "Lec"
    },
    {
      "code": "CSDC7023",
      "fullName": "IR",
      "type": "Lec"
    },
    {
      "code": "CSL701",
      "fullName": "ML Lab",
      "type": "Lab"
    },
    {
      "code": "CSL702",
      "fullName": "BDA Lab",
      "type": "Lab"
    },
    {
      "code": "CSDL7013",
      "fullName": "NLP Lab",
      "type": "Lab"
    },
    {
      "code": "CSDL7022",
      "fullName": "Blockchain Lab",
      "type": "Lab"
    },
    {
      "code": "CSDL7023",
      "fullName": "IR Lab",
      "type": "Lab"
    }
  ],
  "SEM 8": [
    {
      "code": "CSC801",
      "fullName": "DC",
      "type": "Lec"
    },
    {
      "code": "CSDC8013",
      "fullName": "ADS",
      "type": "Lec"
    },
    {
      "code": "CSDC8023",
      "fullName": "SMA",
      "type": "Lec"
    },
    {
      "code": "CSL801",
      "fullName": "DC Lab",
      "type": "Lab"
    },
    {
      "code": "CSDL8013",
      "fullName": "ADS Lab",
      "type": "Lab"
    },
    {
      "code": "CSDL8023",
      "fullName": "SMA Lab",
      "type": "Lab"
    }
  ]
} as const;

export const SUBJECT_MAP = SUBJECTS_DATA;
export const COURSES = ["B.E."] as const;

export const SEMESTERS = ["SEM 5", "SEM 6", "SEM 7", "SEM 8"] as const;
// Dynamic classes depend on semester:
// - SEM 5 & SEM 6 → TE CMPN A/B
// - SEM 7 & SEM 8 → BE CMPN A/B
export const CLASS_BY_SEM = {
  "SEM 5": ["TE CMPN A", "TE CMPN B"],
  "SEM 6": ["TE CMPN A", "TE CMPN B"],
  "SEM 7": ["BE CMPN A", "BE CMPN B"],
  "SEM 8": ["BE CMPN A", "BE CMPN B"],
} as const;
// Backward compatible default (used nowhere after UI update, but kept for safety)
export const CLASSES = CLASS_BY_SEM["SEM 5"];
export const BATCHES = ["1", "2", "3", "4", "All"] as const;
export const BRANCH = "Computer Engineering";

export const EXPERIMENTS = [
  "Exp 1", "Exp 2", "Exp 3", "Exp 4", "Exp 5",
  "Exp 6", "Exp 7", "Exp 8", "Exp 9", "Exp 10"
] as const;

export const COS = ["CO1", "CO2", "CO3", "CO4", "CO5", "CO6"] as const;

