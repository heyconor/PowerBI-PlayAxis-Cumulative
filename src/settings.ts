/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

"use strict";

import { dataViewObjectsParser } from "powerbi-visuals-utils-dataviewutils";
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;

var defaultColors = {
  color1: '#eac435',
  color2: '#345995',
  color3: '#03cea4',
  color4: '#fb4d3d',
  color5: '#ca1551',
  color6: '#000000',
};

export class VisualSettings extends DataViewObjectsParser {
  public transitionSettings: transitionSettings = new transitionSettings();
  public buttonSettingsPlayPause: buttonSettingsPlayPause = new buttonSettingsPlayPause();
  public buttonSettingsStop: buttonSettingsStop = new buttonSettingsStop();
  public buttonSettingsPreviousNext: buttonSettingsPreviousNext = new buttonSettingsPreviousNext();
  public captionSettings: captionSettings = new captionSettings();
}

export class transitionSettings {
  autoStart: boolean = false;
  loop: boolean = false;
  cumulative: boolean = false;
  timeInterval: number = 2000;
  minTimeInterval: number = 10;
  maxTimeInterval: number = 999999;
}

export class buttonSettingsPlayPause {
  combine: boolean = false;
  playColor: string = defaultColors.color1;
  pauseColor: string = defaultColors.color2;
}

export class buttonSettingsStop {
  stopColor: string = defaultColors.color3;
}

export class buttonSettingsPreviousNext {
  show: boolean = true;
  previousColor: string = defaultColors.color4;
  nextColor: string = defaultColors.color5;
}

export class captionSettings {
  show: boolean = true;
  captionColor: string = defaultColors.color6;
  fontSize: number = 16;
  fontFamily: string = 'Arial';
  align: string = 'left';
}



