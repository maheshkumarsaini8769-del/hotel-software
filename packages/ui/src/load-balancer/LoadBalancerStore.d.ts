import { SpilloverLogDTO, StaffWorkloadDTO } from './types';
export declare class LoadBalancerStore {
    private static workloads;
    private static activeSpillovers;
    static setWorkloads(data: StaffWorkloadDTO[]): void;
    static getWorkloads(): StaffWorkloadDTO[];
    static setActiveSpillovers(logs: SpilloverLogDTO[]): void;
    static getActiveSpillovers(): SpilloverLogDTO[];
    static addSpillover(log: SpilloverLogDTO): void;
    static clear(): void;
}
