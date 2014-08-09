(function(){
	"user strict";

	var root = this,
		Chart = root.Chart,
		//Cache a local reference to Chart.helpers
		helpers = Chart.helpers;

	var defaultConfig = {
		backgroundColor: "black",

		radius: Infinity,

		maintainAspectRatio: false
	};

	Chart.Type.extend({

		name: "Meter",

		defaults: defaultConfig,

		initialize: function(data){

			this.segments = [];

			this.MeterSegment = Chart.Rectangle.extend({
				ctx: this.chart.ctx,
				x: 0,
				y: 0,
				width: 0,
				base: this.chart.height,
				strokeWidth: 0,
				inRange : function(chartX,chartY){
					return (chartX >= this.x && chartX <= this.x + this.width) && (chartY >= this.y && chartY <= this.base);
				},
				draw: function(){
					this.ctx.fillStyle = this.fillColor;
					helpers.drawHalfRoundedRectangle(
						this.ctx,
						this.x,
						this.y,
						this.width,
						this.base,
						this.lradius,
						this.rradius
					);
					this.ctx.fill()
				}
			});

			//Set up tooltip events on the chart
			if (this.options.showTooltips){
				helpers.bindEvents(this, this.options.tooltipEvents, function(evt){
					var activeSegments = (evt.type !== 'mouseout') ? this.getSegmentsAtEvent(evt) : [];

					helpers.each(this.segments,function(segment){
						segment.restore(["fillColor"]);
					});
					helpers.each(activeSegments,function(activeSegment){
						// console.log('highlight');
						activeSegment.fillColor = activeSegment.highlightColor;
					});

					this.showTooltip(activeSegments);
				});
			}

			helpers.each(data,function(segment, index){
				this.addData(segment, index, true);
			},this);

			this.calculateTotal(data);

			if (this.options.backgroundColor){
				this.backgroundSegment = new this.MeterSegment({
					value: this.total,
					fillColor : this.options.backgroundColor,
					highlightColor : this.options.backgroundColor,
					width : this.MeterSegment.prototype.base,
					lradius : Math.min(this.MeterSegment.prototype.base / 2, this.options.radius),
					rradius : Math.min(this.MeterSegment.prototype.base / 2, this.options.radius)
				});
			}

			this.render();
		},
		getSegmentsAtEvent: function(e){
			var segmentsArray = [];

			var location = helpers.getRelativePosition(e);

			helpers.each(this.segments,function(segment){
				if (segment.inRange(location.x,location.y)){
					segmentsArray.push(segment);
				}
			},this);

			return segmentsArray;
		},
		calculateTotal: function(data){
			this.total = 0;
			helpers.each(data,function(segment){
				this.total += segment.value;
			},this);

			if (this.options.total && this.options.total > this.total){
				this.total = this.options.total;
			}
		},
		update: function(){
			this.calculateTotal(this.segments);

			// Reset any highlight colours before updating.
			helpers.each(this.activeElements, function(activeElement){
				activeElement.restore(['fillColor']);
			});

			helpers.each(this.segments,function(segment){
				segment.save();
			});

			this.render();
		},
		addData : function(segment, atIndex, silent){
			var index = atIndex || this.segments.length;
			var total = this.total;

			this.segments.splice(index, 0, new this.MeterSegment({
				value : segment.value,
				fillColor : segment.color,
				highlightColor : segment.highlight || segment.color,
				label : segment.label,
				width : 0,
				lradius : 0,
				rradius : 0,
				tooltipPosition : function() {
					return {
						x: this.x + this.width/2,
						y: this.base/2
					};
				}
			}));

			if (!silent){
				this.reflow();
				this.update();
			}
		},
		removeData: function(atIndex){
			var indexToDelete = (helpers.isNumber(atIndex)) ? atIndex : this.segments.length-1;
			this.segments.splice(indexToDelete, 1);
			this.reflow();
			this.update();
		},
		draw: function(ease){
			var easingDecimal = ease || 1;
			this.clear();

			var width = this.chart.width;
			var ctx = this.chart.ctx;

			if (this.options.backgroundColor){
				this.backgroundSegment.transition({
					width : this.chart.width
				},easingDecimal).draw();
			}

			helpers.each(this.segments, function(segment, index){

				if (index === 0){
					segment.lradius = Math.min(segment.base/2, this.options.radius);
				}

				if (index === this.segments.length-1){
					segment.rradius = Math.min(segment.base/2, this.options.radius);
				}

				// hacky fix for highlighting
				segment.width = segment.lradius + segment.rradius;
				segment._saved.width = segment.lradius + segment.rradius;

				segment.transition({
					width: segment.value / this.total * width
				},easingDecimal).draw();

				if (index < this.segments.length-1){
					this.segments[index+1].x = segment.x + segment.width;
				}

			},this);
		}
	});

}).call(this)
