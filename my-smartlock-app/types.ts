
export interface LockModel {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
