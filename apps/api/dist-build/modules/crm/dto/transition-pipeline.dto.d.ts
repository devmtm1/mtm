export declare class TransitionPipelineDto {
    statutPipeline: string;
    justification?: string;
}
export declare const PIPELINE_TERMINAL_STAGES: readonly ["vente", "perdu"];
export type PipelineTerminalStage = (typeof PIPELINE_TERMINAL_STAGES)[number];
