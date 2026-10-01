import { SpilloverLogDTO, StaffWorkloadDTO } from './types';

export class LoadBalancerStore {
  private static workloads: StaffWorkloadDTO[] = [];
  private static activeSpillovers: SpilloverLogDTO[] = [];

  static setWorkloads(data: StaffWorkloadDTO[]): void {
    this.workloads = data;
  }

  static getWorkloads(): StaffWorkloadDTO[] {
    return this.workloads;
  }

  static setActiveSpillovers(logs: SpilloverLogDTO[]): void {
    this.activeSpillovers = logs;
  }

  static getActiveSpillovers(): SpilloverLogDTO[] {
    return this.activeSpillovers;
  }

  static addSpillover(log: SpilloverLogDTO): void {
    this.activeSpillovers.unshift(log);
  }

  static clear(): void {
    this.workloads = [];
    this.activeSpillovers = [];
  }
}
