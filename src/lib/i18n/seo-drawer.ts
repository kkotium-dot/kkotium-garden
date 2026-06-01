// TS view over seo-drawer.ko.json. Korean strings stay in JSON (rule #35).

import raw from "./seo-drawer.ko.json";

export interface SeoDrawerCopy {
  drawer: {
    title: string;
    subtitle: string;
    close: string;
    save: string;
    saving: string;
    saved: string;
    saveFailed: string;
    openExternal: string;
    originalName: string;
    originalNameNote: string;
  };
  title: {
    label: string;
    placeholder: string;
    helpRecommendedUnder: string;
    helpRange: string;
    helpOver: string;
    countSuffix: string;
  };
  duplicate: {
    warningBadge: string;
    warningPrefix: string;
    warningSuffix: string;
    highlightedWord: string;
    ok: string;
  };
  keywords: {
    label: string;
    placeholder: string;
    help: string;
  };
  description: {
    label: string;
    placeholder: string;
  };
  volume: {
    title: string;
    subtitle: string;
    empty: string;
    loading: string;
    errorCredentials: string;
    errorGeneric: string;
    competitionLow: string;
    competitionMid: string;
    competitionHigh: string;
    competitionUnknown: string;
    monthlyLabel: string;
    pickToInsert: string;
    alreadyInTitle: string;
    insertedToast: string;
    caveat: string;
    goldenGrade: {
      premium: string;
      good: string;
      normal: string;
      caution: string;
    };
  };
  footer: {
    phaseNote: string;
  };
}

export const seoDrawerCopy: SeoDrawerCopy = raw as unknown as SeoDrawerCopy;
