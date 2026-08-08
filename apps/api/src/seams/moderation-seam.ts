export interface KytePublishedEvent {
  kyteId: string;
  username: string | null;
  publishSeq: number;
}

export interface ModerationSeam {
  enqueueKyteScan(event: KytePublishedEvent): void | Promise<void>;
}

let seam: ModerationSeam | null = null;

export function registerModerationSeam(impl: ModerationSeam): void {
  seam = impl;
}

export function onKytePublished(event: KytePublishedEvent): void {
  void seam?.enqueueKyteScan(event);
}
