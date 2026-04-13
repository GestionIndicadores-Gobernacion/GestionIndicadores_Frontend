import { EventEmitter } from '@angular/core';
import { ComponentIndicatorModel } from '../../../../../features/report/models/component.model';

export interface IndicatorFieldInputs {
    indicator: ComponentIndicatorModel;
    value: any;
}

export interface IndicatorFieldOutputs {
    valueChange: EventEmitter<any>;
}