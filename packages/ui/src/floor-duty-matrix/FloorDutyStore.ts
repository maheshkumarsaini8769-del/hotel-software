import { FloorOverviewSummaryDTO } from './types';

export class FloorDutyStore {
  private static summaries: FloorOverviewSummaryDTO[] = [];

  static setSummaries(data: FloorOverviewSummaryDTO[]): void {
    this.summaries = data;
  }

  static getSummaries(): FloorOverviewSummaryDTO[] {
    return this.summaries;
  }

  static getFloorByCode(floorCode: string): FloorOverviewSummaryDTO | undefined {
    return this.summaries.find((f) => f.floorCode.toUpperCase() === floorCode.toUpperCase());
  }

  static clear(): void {
    this.summaries = [];
  }
}
