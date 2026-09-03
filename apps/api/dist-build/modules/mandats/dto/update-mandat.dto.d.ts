import { CreateMandatDto } from './create-mandat.dto';
declare const UpdateMandatDto_base: import("@nestjs/common").Type<Partial<CreateMandatDto>>;
export declare class UpdateMandatDto extends UpdateMandatDto_base {
    justification?: string;
}
export {};
