/*
*  Power BI Visual CLI
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

import "core-js/stable";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

//Newly added things
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import * as d3 from "d3";
type Selection<T extends d3.BaseType> = d3.Selection<T, any,any, any>;
import ISelectionId = powerbi.visuals.ISelectionId;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import DataViewCategorical = powerbi.DataViewCategorical;

/**
 * Interface for data points.
 *
 * @interface
 * @property {string} category          - Corresponding category of data value.
 * @property {ISelectionId} selectionId - Id assigned to data point for cross filtering
 *                                        and visual interaction.
 */
interface CategoryDataPoint {
    category: string;
    selectionId: ISelectionId;
};

enum Status {Play, Pause, Stop, Disabled, Refresh}

import { VisualSettings } from "./settings";
export class Visual implements IVisual {
    private host: IVisualHost;
    private selectionManager: ISelectionManager;
    private svg: Selection<SVGElement>;
    private controlsSVG: Selection<SVGElement>;
    private captionSVG: Selection<SVGElement>;
    private visualDataPoints: CategoryDataPoint[];
    private visualSettings: VisualSettings;
    private status: Status;
    private lastSelected: number;
    private fieldName: string;
    private timers: any;
    private dataPoints: any;
    private isCumulative: boolean;
    private showStepButtons: boolean = true;
    private combinePlayPauseButtons: boolean = false;

    private svgPlayPath: string = "M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-3 17v-10l9 5.146-9 4.854z";
    private svgPausePath: string = "M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-1 17h-3v-10h3v10zm5-10h-3v10h3v-10z";

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.selectionManager = options.host.createSelectionManager();
        this.status = Status.Refresh;
        this.timers = [];
        let buttonNames = ["play","pause","stop","previous","next"];
        let buttonPathNames = ["playPath","pausePath","stopPath","previousPath","nextPath"];
        let buttonPath = [
            this.svgPlayPath, 
            this.svgPausePath,
            "M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-1 17h-3.5v-10h9v10z",
            "M22 12c0 5.514-4.486 10-10 10s-10-4.486-10-10 4.486-10 10-10 10 4.486 10 10zm-22 0c0 6.627 5.373 12 12 12s12-5.373 12-12-5.373-12-12-12-12 5.373-12 12zm13 0l5-4v8l-5-4zm-5 0l5-4v8l-5-4zm-2 4h2v-8h-2v8z",
            "M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-6 16v-8l5 4-5 4zm5 0v-8l5 4-5 4zm7-8h-2v8h2v-8z"
        ];

        this.svg = d3.select(options.element).append("svg").attr("width","100%").attr("height","100%");
        
        //Append caption text           
        this.captionSVG = this.svg.append('svg').attr('class', 'captionSVG');
        let captionBox = this.captionSVG.append('g');
        captionBox.append('text').attr('dy','0.22em').attr('id','label');

        this.controlsSVG = this.svg.append('svg').attr('class', 'controlsSVG');
        for (let i = 0; i < buttonNames.length; ++i) {
            let container = this.controlsSVG.append('g')
                .attr('class', "controls")
                .attr('transform','translate(' + 30*i + ')')
                .attr('id', buttonNames[i]); 
            container.append("path").attr("d", buttonPath[i]).attr('id', buttonPathNames[i]);
        }

        //Events on click
        this.svg.select("#play").on("click", () => {
            this.triggerPlayAnimation();
        });
        this.svg.select("#stop").on("click", () => {
            this.triggerStopAnimation();
        });
        this.svg.select("#pause").on("click", () => {
            this.triggerPauseAnimation();
        });     
        this.svg.select("#previous").on("click", () => {
            this.triggerStep(-1);
        });     
        this.svg.select("#next").on("click", () => {
            this.triggerStep(1);
        });  

        this.resetAnimation(false);        
    }

    private static parseSettings(dataView: DataView): VisualSettings {
        return <VisualSettings>VisualSettings.parse(dataView);
    }

    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
        return VisualSettings.enumerateObjectInstances(this.visualSettings || VisualSettings.getDefault(), options);
    }

    public update(options: VisualUpdateOptions) {
        //Get dataPoints
        this.dataPoints = [];
        let dataView: DataView = options.dataViews[0];
        const categoricalDataView: DataViewCategorical = dataView.categorical;

        //Only proceed if data points exist
        if (!categoricalDataView ||
            !categoricalDataView.categories ||
            !categoricalDataView.categories[0] ||
            !categoricalDataView.categories[0].values) {
            this.disableButtons();
            return;
        } else {
            // categories
            const categories = dataView.categorical.categories;
            const categoriesCount = categories[0].values.length;
            // iterate all categories to generate selection ids
            for (let categoryIndex = 0; categoryIndex < categoriesCount; categoryIndex++) {
                let categoryValue: powerbi.PrimitiveValue = categories[0].values[categoryIndex];
                const categorySelectionId = this.host.createSelectionIdBuilder().withCategory(categories[0], categoryIndex).createSelectionId();
                if(categoryValue && categorySelectionId){ this.dataPoints.push({ category: categoryValue, selectionId: categorySelectionId });}
            }
            
            //Get visualSettings
            this.visualSettings = Visual.parseSettings(options && options.dataViews && options.dataViews[0]);
            
            //Validate visualSettings
            this.validateVisualSettingInputs();
            
            //Set the animation to begin in a stopped state
            this.status = Status.Refresh;
            this.triggerStopAnimation();

            //Start playing without click 
            if (this.visualSettings.transitionSettings.autoStart) { 
                if(this.combinePlayPauseButtons){
                    this.triggerPlayPauseAnimation();
                } else {
                    this.triggerPlayAnimation();
                }
            }

            //Change colors         
            this.svg.selectAll("#play").attr("fill", this.visualSettings.buttonSettingsPlayPause.playColor);
            this.svg.selectAll("#pause").attr("fill", this.visualSettings.buttonSettingsPlayPause.pauseColor);
            this.svg.selectAll("#stop").attr("fill", this.visualSettings.buttonSettingsStop.stopColor);
            if(this.showStepButtons){
                this.svg.selectAll("#previous").attr("fill", this.visualSettings.buttonSettingsPreviousNext.previousColor);
                this.svg.selectAll("#next").attr("fill", this.visualSettings.buttonSettingsPreviousNext.nextColor);
            }
            let captionColor = this.visualSettings.captionSettings.captionColor;      
            this.svg.select("#label").attr("fill", captionColor);

            //Change caption font size & family
            let fontSize = this.visualSettings.captionSettings.fontSize;
            let fontFamily = this.visualSettings.captionSettings.fontFamily;
            this.svg.select("#label").attr("font-size", fontSize);
            this.svg.select("#label").attr("font-family", fontFamily);

            //Check if field name has changed and update accordingly
            if (this.fieldName != options.dataViews[0].categorical.categories[0].source.displayName) {
                this.fieldName = options.dataViews[0].categorical.categories[0].source.displayName;
                this.resetAnimation(this.visualSettings.transitionSettings.autoStart);
            }

            //Adjust SVG display depending on what options are selected
            this.adjustSVGDisplay();            

            //Update selection if bookmarked was clicked
            let ids = this.selectionManager.getSelectionIds() as ISelectionId[];
            if(ids.length == 1) { //Number of selected ids should be 1 and status different than play (this.status != Status.Play)
                this.visualDataPoints.forEach((dataPoint, index) => {
                    if(ids[0].includes(dataPoint.selectionId)) {
                        this.lastSelected = index;
                        if(this.combinePlayPauseButtons){
                            this.triggerPlayPauseAnimation();
                        } else {
                            this.triggerPauseAnimation();
                        }
                        this.triggerStep(0);
                        return;
                    }
                });
            }
        }
    }

    private adjustSVGDisplay(){
        const captionPadding = 5;
        const buttonWidth_5 = 145;
        const buttonWidth_4 = 115;
        const buttonWidth_3 = 84.2;
        const buttonWidth_2 = 54.2;
        const viewBoxHeight = 25;
        var assignedButtonWidth = buttonWidth_5;

        //Hide the step buttons (if required)
        if(!this.showStepButtons){
            //this.svg.selectAll("#previous, #next").remove();
            this.svg.selectAll("#previous, #next").style('visibility','hidden');
            assignedButtonWidth = buttonWidth_3;
        } else {
            this.svg.selectAll("#previous, #next").style('visibility','visible');
            assignedButtonWidth = buttonWidth_5;
        }

        //Adjust click behaviour of Play button & Hide Pause Buton
        if(this.combinePlayPauseButtons){
            this.svg.select("#play").on("click", () => { this.triggerPlayPauseAnimation(); });
            this.svg.selectAll("#pause").style('visibility','hidden');
            //Shift #stop, #previous, #next & caption buttons to the LEFT
            this.svg.select("#stop").attr('transform','translate(30)');
            if(this.showStepButtons){
                this.svg.select("#previous").attr('transform','translate(60)');
                this.svg.select("#next").attr('transform','translate(90)');
                assignedButtonWidth = buttonWidth_4;
            } else {
                assignedButtonWidth = buttonWidth_2;
            }
        } else {
            this.togglePlayPauseAppearance('play');
            this.svg.select("#play").on("click", () => { this.triggerPlayAnimation(); });
            this.svg.selectAll("#pause").style('visibility','visible');
            //Shift #stop, #previous, #next & caption buttons to the RIGHT
            this.svg.select("#stop").attr('transform','translate(60)');
            if(this.showStepButtons){
                this.svg.select("#previous").attr('transform','translate(90)');
                this.svg.select("#next").attr('transform','translate(120)');
                assignedButtonWidth = buttonWidth_5;
            } else {
                assignedButtonWidth = buttonWidth_3;
            }
        }
        
        //Change title
        if (this.visualSettings.captionSettings.show) {
            if (this.status != Status.Play) { this.updateCaption(this.fieldName); }                        

            let node: any = <SVGElement>this.svg.select("#label").node();
            let TextBBox = node.getBBox();
            let viewBoxWidth = assignedButtonWidth + TextBBox.width + (captionPadding * 2);

            this.controlsSVG.attr("viewBox","0 0 " + viewBoxWidth + " " + viewBoxHeight).attr('preserveAspectRatio','xMinYMid');
    
            if (this.visualSettings.captionSettings.align == "right") {
                this.captionSVG.select("text").attr('text-anchor', 'end').attr("x","100%");
                this.captionSVG.attr("viewBox","0 -14 " + viewBoxWidth + " " + viewBoxHeight).attr('preserveAspectRatio','xMaxYMid');
            } else if (this.visualSettings.captionSettings.align == "center") {
                this.captionSVG.select("text").attr('text-anchor', 'middle').attr("x","50%");
                this.captionSVG.attr("viewBox","-" + ((assignedButtonWidth + captionPadding) * 0.5) + " -14 " + viewBoxWidth  + " " + viewBoxHeight).attr('preserveAspectRatio','xMidYMid');
            } else {
                this.captionSVG.select("text").attr('text-anchor', 'start').attr("x","0%");
                this.captionSVG.attr("viewBox","-" + (assignedButtonWidth + captionPadding) + " -14 " + viewBoxWidth  + " " + viewBoxHeight).attr('preserveAspectRatio','xMinYMid');
            }
        } else {
            this.svg.select("#label").text("");
            this.controlsSVG
            .attr("viewBox","0 0 " + assignedButtonWidth + " " + viewBoxHeight)
            .attr('preserveAspectRatio','xMinYMid'); 
        }
    }

    private validateVisualSettingInputs(){
        //timeInterval can't be less than minTimeInterval (10)
        this.visualSettings.transitionSettings.timeInterval = Math.max(this.visualSettings.transitionSettings.minTimeInterval,this.visualSettings.transitionSettings.timeInterval);
        //timeInterval can't be greater than maxTimeInterval (999,999)
        this.visualSettings.transitionSettings.timeInterval = Math.min(this.visualSettings.transitionSettings.maxTimeInterval,this.visualSettings.transitionSettings.timeInterval);
        //Assign isCumulative
        this.isCumulative = this.visualSettings.transitionSettings.cumulative;
        //Assign combinePlayPauseButtons
        this.combinePlayPauseButtons = this.visualSettings.buttonSettingsPlayPause.combine;
        //Assign showStepButtons
        this.showStepButtons = this.visualSettings.buttonSettingsPreviousNext.show;
    }

    public resetAnimation(autoStart : boolean) {
        this.lastSelected = -1;
        if (autoStart) {
            this.svg.selectAll("#play, #next, #previous").attr("opacity", "0.3");
            this.svg.selectAll("#stop, #pause").attr("opacity", "1");
        } else {
            this.triggerStopAnimation();
        }
    }

    public triggerPlayAnimation() {
        if (this.status == Status.Disabled || this.status == Status.Play) return;
        this.svg.selectAll("#play, #next, #previous").attr("opacity", "0.3");
        this.svg.selectAll("#stop, #pause").attr("opacity", "1");
        this.playAnimation();
    }

    public playAnimation() {
        let timeInterval = this.visualSettings.transitionSettings.timeInterval;
        let startingIndex = this.lastSelected + 1;

        var captionText = '';
        for (let i = startingIndex; i < this.dataPoints.length; ++i) {                           
            let timer = setTimeout(() => {
                if(this.isCumulative){
                    this.selectionManager.select(this.dataPoints[i].selectionId, true);
                    captionText = this.dataPoints[i].category + ' [' + (i+1) + '/' + this.dataPoints.length + ']';
                } else {
                    this.selectionManager.select(this.dataPoints[i].selectionId, false);
                    captionText = this.dataPoints[i].category;
                }
                this.lastSelected = i;
                this.updateCaption(captionText);
            }, (i - this.lastSelected -1) * timeInterval); 
            this.timers.push(timer);
        }

        //replay or stop after one cycle
        let stopAnimationTimer = setTimeout(() => {
            if(this.visualSettings.transitionSettings.loop) {
                this.status = Status.Stop;
                this.lastSelected = -1;
                this.triggerPlayAnimation();
            } else {
                this.triggerStopAnimation();
            }
        }, (this.dataPoints.length - this.lastSelected) * timeInterval); 
        this.timers.push(stopAnimationTimer);
        this.status = Status.Play;
    }

    public triggerPlayPauseAnimation() {
        if(this.status == Status.Play){
            if(this.lastSelected == -1){ return; }
            //Adjust button attributes based on PAUSE state
            this.togglePlayPauseAppearance('play');
            this.svg.selectAll("#stop, #next, #previous").attr("opacity", "1");
            //Pause the animation
            this.pauseAnimation();
        } else if(this.status == Status.Pause || this.status == Status.Stop){
            //Adjust button attributes based on PLAY state
            this.togglePlayPauseAppearance('pause');
            this.svg.selectAll("#next, #previous").attr("opacity", "0.3");
            this.svg.selectAll("#stop").attr("opacity", "1");
            //Play the animation
            this.playAnimation();
        }
    }

    public togglePlayPauseAppearance(appearance : string){
        if(appearance=='play'){
            this.svg.select("#playPath").attr("d", this.svgPlayPath);
        } else {
            this.svg.select("#playPath").attr("d", this.svgPausePath);
        }
    }

    public triggerStopAnimation() {
        if (this.status == Status.Disabled || this.status == Status.Stop) return; 
        this.svg.selectAll("#pause, #stop, #previous").attr("opacity", "0.3");
        this.svg.selectAll("#play, #next").attr("opacity", "1");
        if(this.combinePlayPauseButtons){ this.togglePlayPauseAppearance('play'); }
        this.stopAnimation();
    }

    public stopAnimation() {
        for (let i of this.timers) { clearTimeout(i); }
        this.updateCaption(this.fieldName);
        this.lastSelected = -1;
        this.selectionManager.clear();
        this.status = Status.Stop;
    }

    public triggerPauseAnimation() {
        if (this.status == Status.Disabled || this.status == Status.Pause || this.lastSelected == -1) return;
        this.svg.selectAll("#pause").attr("opacity", "0.3");
        this.svg.selectAll("#play, #stop, #next, #previous").attr("opacity", "1"); 
        this.pauseAnimation();
    }

    public pauseAnimation() {
        for (let i of this.timers) { clearTimeout(i); } 
        this.status = Status.Pause;
    }

    public triggerStep(step: number) {
        if (this.status == Status.Disabled || this.status == Status.Play || (this.status == Status.Stop && step < 1)) return;
        //Check if selection is within limits
        if ((this.lastSelected + step) < 0 || (this.lastSelected + step) > (this.dataPoints.length-1)) return;
        let previousButtonOpacity = (this.lastSelected + step) == 0 ? 0.3 : 1;
        let nextButtonOpacity = (this.lastSelected + step) == (this.dataPoints.length-1) ? 0.3 : 1;
        this.svg.selectAll("#stop").attr("opacity", 1);
        this.svg.selectAll("#previous").attr("opacity", previousButtonOpacity);
        this.svg.selectAll("#next").attr("opacity", nextButtonOpacity);
        this.lastSelected = this.lastSelected + step;
        this.step(step);
    }

    public step(step: number) {
        var captionText = '';
        if(this.isCumulative){
            let selectedIDs = this.selectionManager.getSelectionIds();
            let selectedDataPoints = this.dataPoints.map(item => { return item.selectionId; });
            selectedDataPoints.length = selectedIDs.length + step;
            this.selectionManager.select(selectedDataPoints);
            captionText = this.dataPoints[this.lastSelected].category + ' [' + (this.lastSelected + 1) + '/' + this.dataPoints.length + ']';
        } else {
            this.selectionManager.select(this.dataPoints[this.lastSelected].selectionId);
            captionText = this.dataPoints[this.lastSelected].category;
        }
        this.updateCaption(captionText);
        this.status = Status.Pause;
    }

    public updateCaption(caption: string) {
        if (this.visualSettings && this.visualSettings.captionSettings && this.visualSettings.captionSettings.show) {
            this.svg.select("#label").text(caption);
        }
    }

    public disableButtons(){
        //Display all buttons in disabled state
        this.svg.selectAll("#play, #pause, #stop, #previous, #next").attr("opacity", "0.3");
        this.status = Status.Disabled;
    }
}