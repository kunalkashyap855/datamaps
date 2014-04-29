(function() {
  var svg;

  //save off default references
  var d3 = window.d3, topojson = window.topojson;
  
  var defaultOptions = {
    scope: 'world',
    setProjection: setProjection,
    projection: 'equirectangular',
    dataType: 'json',
    done: function() {},
    fills: {
      defaultFill: '#ABDDA4'
    },
    geographyConfig: {
        dataUrl: null,
        hideAntarctica: true,
        borderWidth: 1,
        borderColor: '#FDFDFD',
        popupTemplate: function(geography, data) {
          return '<div class="hoverinfo"><strong>' + geography.properties.name + '</strong></div>';
        },
        popupOnHover: true,
        highlightOnHover: true,
        highlightFillColor: '#FC8D59',
        highlightBorderColor: 'rgba(250, 15, 160, 0.2)',
        highlightBorderWidth: 2
    },
    bubblesConfig: {
        borderWidth: 2,
        borderColor: '#FFFFFF',
        popupOnHover: true,
        popupTemplate: function(geography, data) {
          return '<div class="hoverinfo"><strong>' + data.name + '</strong></div>';
        },
        fillOpacity: 0.75,
        animate: true,
        highlightOnHover: true,
        highlightFillColor: '#FC8D59',
        highlightBorderColor: 'rgba(250, 15, 160, 0.2)',
        highlightBorderWidth: 2,
        highlightFillOpacity: 0.85,
        exitDelay: 100
    },
    arcConfig: {
      strokeColor: '#DD1C77',
      strokeWidth: 1,
      arcSharpness: 1,
      animationSpeed: 600
    }
  };

  function addContainer( element ) {
    this.svg = d3.select( element ).append('svg')
      .attr('width', element.offsetWidth)
      .attr('class', 'datamap')
      .attr('height', element.offsetHeight);

    return this.svg;
  }

  // setProjection takes the svg element and options
  function setProjection( element, options ) {
    var projection, path;
    if ( options && typeof options.scope === 'undefined') {
      options.scope = 'world';
    }

    if ( options.scope === 'usa' ) {
      projection = d3.geo.albersUsa()
        .scale(element.offsetWidth)
        .translate([element.offsetWidth / 2, element.offsetHeight / 2]);
    }
    else if ( options.scope === 'world' ) {
      projection = d3.geo[options.projection]()
        .scale((element.offsetWidth + 1) / 2 / Math.PI)
        .translate([element.offsetWidth / 2, element.offsetHeight / (options.projection === "mercator" ? 1.45 : 1.8)]);
    }

    path = d3.geo.path()
      .projection( projection );

    return {path: path, projection: projection};
  }

  function addStyleBlock() {
    if ( d3.select('.datamaps-style-block').empty() ) {
      d3.select('head').attr('class', 'datamaps-style-block').append('style')
      .html('.datamap path {stroke: #FFFFFF; stroke-width: 1px;} .datamaps-legend dt, .datamaps-legend dd { float: left; margin: 0 3px 0 0;} .datamaps-legend dd {width: 20px; margin-right: 6px; border-radius: 3px;} .datamaps-legend {padding-bottom: 20px; z-index: 1001; position: absolute; left: 4px; font-size: 12px; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;} .datamaps-hoverover {display: none; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; } .hoverinfo {padding: 4px; border-radius: 1px; background-color: #FFF; box-shadow: 1px 1px 5px #CCC; font-size: 12px; border: 1px solid #CCC; } .hoverinfo hr {border:1px dotted #CCC; }');
    }
  }

  function drawSubunits( data ) {
    var fillData = this.options.fills,
        colorCodeData = this.options.data || {},
        geoConfig = this.options.geographyConfig;


    var subunits = this.svg.select('g.datamaps-subunits');
    if ( subunits.empty() ) {
      subunits = this.addLayer('datamaps-subunits', null, true);
    }

    var geoData = topojson.feature( data, data.objects[ this.options.scope ] ).features;
    if ( geoConfig.hideAntarctica ) {
      geoData = geoData.filter(function(feature) {
        return feature.id !== "ATA";
      });
    }

    var geo = subunits.selectAll('path.datamaps-subunit').data( geoData );

    geo.enter()
      .append('path')
      .attr('d', this.path)
      .attr('class', function(d) {
        return 'datamaps-subunit ' + d.id;
      })
      .attr('data-info', function(d) {
        return JSON.stringify( colorCodeData[d.id]);
      })
      .style('fill', function(d) {
        var fillColor;

        if ( colorCodeData[d.id] ) {
          fillColor = fillData[ colorCodeData[d.id].fillKey ];
        }

        return fillColor || fillData.defaultFill;
      })
      .style('stroke-width', geoConfig.borderWidth)
      .style('stroke', geoConfig.borderColor);
  }

  function handleGeographyConfig () {
    var hoverover;
    var svg = this.svg;
    var self = this;
    var options = this.options.geographyConfig;

    if ( options.highlightOnHover || options.popupOnHover ) {
      svg.selectAll('.datamaps-subunit')
        .on('mouseover', function(d) {
          var $this = d3.select(this);

          if ( options.highlightOnHover ) {
            var previousAttributes = {
              'fill':  $this.style('fill'),
              'stroke': $this.style('stroke'),
              'stroke-width': $this.style('stroke-width'),
              'fill-opacity': $this.style('fill-opacity')
            };

            $this
              .style('fill', options.highlightFillColor)
              .style('stroke', options.highlightBorderColor)
              .style('stroke-width', options.highlightBorderWidth)
              .style('fill-opacity', options.highlightFillOpacity)
              .attr('data-previousAttributes', JSON.stringify(previousAttributes));

            //as per discussion on https://github.com/markmarkoh/datamaps/issues/19
            if ( ! /MSIE/.test(navigator.userAgent) ) {
             moveToFront.call(this);
            }
          }

          if ( options.popupOnHover ) {
            self.updatePopup($this, d, options, svg);
          }
        })
        .on('mouseout', function() {
          var $this = d3.select(this);

          if (options.highlightOnHover) {
            //reapply previous attributes
            var previousAttributes = JSON.parse( $this.attr('data-previousAttributes') );
            for ( var attr in previousAttributes ) {
              $this.style(attr, previousAttributes[attr]);
            }
          }
          $this.on('mousemove', null);
          d3.selectAll('.datamaps-hoverover').style('display', 'none');
        });
    }
    
    function moveToFront() {
      this.parentNode.appendChild(this);
    }
  }

  //plugin to add a simple map legend
  function addLegend(layer, data, options) {
    data = data || {};
    if ( !this.options.fills ) {
      return;
    }

    var html = '<dl>';
    var label = '';
    if ( data.legendTitle ) {
      html = '<h2>' + data.legendTitle + '</h2>' + html;
    }
    for ( var fillKey in this.options.fills ) {

      if ( fillKey === 'defaultFill') {
        if (! data.defaultFillName ) {
          continue;
        }
        label = data.defaultFillName;
      } else {
        if (data.labels && data.labels[fillKey]) {
          label = data.labels[fillKey];
        } else {
          label= fillKey + ': ';
        }
      }
      html += '<dt>' + label + '</dt>';
      html += '<dd style="background-color:' +  this.options.fills[fillKey] + '">&nbsp;</dd>';
    }
    html += '</dl>';

    var hoverover = d3.select( this.options.element ).append('div')
      .attr('class', 'datamaps-legend')
      .html(html);
  }

  function handleArcs (layer, data, options) {
    var self = this,
        svg = this.svg;

    if ( !data || (data && !data.slice) ) {
      throw "Datamaps Error - arcs must be an array";
    }

    if ( typeof options === "undefined" ) {
      options = defaultOptions.arcConfig;
    }

    var arcs = layer.selectAll('path.datamaps-arc').data( data, JSON.stringify );

    arcs
      .enter()
        .append('svg:path')
        .attr('class', 'datamaps-arc')
        .style('stroke-linecap', 'round')
        .style('stroke', function(datum) {
          if ( datum.options && datum.options.strokeColor) {
            return datum.options.strokeColor;
          }
          return  options.strokeColor
        })
        .style('fill', 'none')
        .style('stroke-width', function(datum) {
          if ( datum.options && datum.options.strokeWidth) {
            return datum.options.strokeWidth;
          }
          return options.strokeWidth;
        })
        .attr('d', function(datum) {
            var originXY = self.latLngToXY(datum.origin.latitude, datum.origin.longitude);
            var destXY = self.latLngToXY(datum.destination.latitude, datum.destination.longitude);
            var midXY = [ (originXY[0] + destXY[0]) / 2, (originXY[1] + destXY[1]) / 2];
            return "M" + originXY[0] + ',' + originXY[1] + "S" + (midXY[0] + (50 * options.arcSharpness)) + "," + (midXY[1] - (75 * options.arcSharpness)) + "," + destXY[0] + "," + destXY[1];
        })
        .transition()
          .delay(100)
          .style('fill', function() {
            /*
              Thank you Jake Archibald, this is awesome.
              Source: http://jakearchibald.com/2013/animated-line-drawing-svg/
            */
            var length = this.getTotalLength();
            this.style.transition = this.style.WebkitTransition = 'none';
            this.style.strokeDasharray = length + ' ' + length;
            this.style.strokeDashoffset = length;
            this.getBoundingClientRect();
            this.style.transition = this.style.WebkitTransition = 'stroke-dashoffset ' + options.animationSpeed + 'ms ease-out';
            this.style.strokeDashoffset = '0';
            return 'none';
          })

    arcs.exit()
      .transition()
      .style('opacity', 0)
      .remove();
  }

  function handleLabels ( layer, options ) {
    var self = this;
    options = options || {};
    var labelStartCoodinates = this.projection([-67.707617, 42.722131]);
    this.svg.selectAll(".datamaps-subunit")
      .attr("data-foo", function(d) {
        var center = self.path.centroid(d);
        var xOffset = 7.5, yOffset = 5;

        if ( ["FL", "KY", "MI"].indexOf(d.id) > -1 ) xOffset = -2.5;
        if ( d.id === "NY" ) xOffset = -1;
        if ( d.id === "MI" ) yOffset = 18;
        if ( d.id === "LA" ) xOffset = 13;

        var x,y;

        x = center[0] - xOffset;
        y = center[1] + yOffset;

        var smallStateIndex = ["VT", "NH", "MA", "RI", "CT", "NJ", "DE", "MD", "DC"].indexOf(d.id);
        if ( smallStateIndex > -1) {
          var yStart = labelStartCoodinates[1];
          x = labelStartCoodinates[0];
          y = yStart + (smallStateIndex * (2+ (options.fontSize || 12)));
          layer.append("line")
            .attr("x1", x - 3)
            .attr("y1", y - 5)
            .attr("x2", center[0])
            .attr("y2", center[1])
            .style("stroke", options.labelColor || "#000")
            .style("stroke-width", options.lineWidth || 1)
        }

        layer.append("text")
          .attr("x", x)
          .attr("y", y)
          .style("font-size", (options.fontSize || 10) + 'px')
          .style("font-family", options.fontFamily || "Verdana")
          .style("fill", options.labelColor || "#000")
          .text( d.id );
        return "bar";
      });
  }


  function handleBubbles (layer, data, options ) {
    var self = this,
        fillData = this.options.fills,
        svg = this.svg;

    if ( !data || (data && !data.slice) ) {
      throw "Datamaps Error - bubbles must be an array";
    }

    var bubbles = layer.selectAll('circle.datamaps-bubble').data( data, JSON.stringify );

    bubbles
      .enter()
        .append('svg:circle')
        .attr('class', 'datamaps-bubble')
        .attr('cx', function ( datum ) {
          var latLng;
          if ( datumHasCoords(datum) ) {
            latLng = self.latLngToXY(datum.latitude, datum.longitude);
          }
          else if ( datum.centered ) {
            latLng = self.path.centroid(svg.select('path.' + datum.centered).data()[0]);
          }
          if ( latLng ) return latLng[0];
        })
        .attr('cy', function ( datum ) {
          var latLng;
          if ( datumHasCoords(datum) ) {
            latLng = self.latLngToXY(datum.latitude, datum.longitude);
          }
          else if ( datum.centered ) {
            latLng = self.path.centroid(svg.select('path.' + datum.centered).data()[0]);
          }
          if ( latLng ) return latLng[1];;
        })
        .attr('r', 0) //for animation purposes
        .attr('data-info', function(d) {
          return JSON.stringify(d);
        })
        .style('stroke', options.borderColor)
        .style('stroke-width', options.borderWidth)
        .style('fill-opacity', options.fillOpacity)
        .style('fill', function ( datum ) {
          var fillColor = fillData[ datum.fillKey ];
          return fillColor || fillData.defaultFill;
        })
        .on('mouseover', function ( datum ) {
          var $this = d3.select(this);

          if (options.highlightOnHover) {
            //save all previous attributes for mouseout
            var previousAttributes = {
              'fill':  $this.style('fill'),
              'stroke': $this.style('stroke'),
              'stroke-width': $this.style('stroke-width'),
              'fill-opacity': $this.style('fill-opacity')
            };

            $this
              .style('fill', options.highlightFillColor)
              .style('stroke', options.highlightBorderColor)
              .style('stroke-width', options.highlightBorderWidth)
              .style('fill-opacity', options.highlightFillOpacity)
              .attr('data-previousAttributes', JSON.stringify(previousAttributes));
          }

          if (options.popupOnHover) {
            self.updatePopup($this, datum, options, svg);
          }
        })
        .on('mouseout', function ( datum ) {
          var $this = d3.select(this);

          if (options.highlightOnHover) {
            //reapply previous attributes
            var previousAttributes = JSON.parse( $this.attr('data-previousAttributes') );
            for ( var attr in previousAttributes ) {
              $this.style(attr, previousAttributes[attr]);
            }
          }

          d3.selectAll('.datamaps-hoverover').style('display', 'none');
        })
        .transition().duration(400)
          .attr('r', function ( datum ) {
            return datum.radius;
          });

    bubbles.exit()
      .transition()
        .delay(options.exitDelay)
        .attr("r", 0)
        .remove();

    function datumHasCoords (datum) {
      return typeof datum !== 'undefined' && typeof datum.latitude !== 'undefined' && typeof datum.longitude !== 'undefined';
    }

  }

  //stolen from underscore.js
  function defaults(obj) {
    Array.prototype.slice.call(arguments, 1).forEach(function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] == null) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  }
  /**************************************
             Public Functions
  ***************************************/

  function Datamap( options ) {

    if ( typeof d3 === 'undefined' || typeof topojson === 'undefined' ) {
      throw new Error('Include d3.js (v3.0.3 or greater) and topojson on this page before creating a new map');
   }

    //set options for global use
    this.options = defaults(options, defaultOptions);
    this.options.geographyConfig = defaults(options.geographyConfig, defaultOptions.geographyConfig);
    this.options.bubblesConfig = defaults(options.bubblesConfig, defaultOptions.bubblesConfig);
    this.options.arcConfig = defaults(options.arcConfig, defaultOptions.arcConfig);

    //add the SVG container
    if ( d3.select( this.options.element ).select('svg').length > 0 ) {
      addContainer.call(this, this.options.element );
    }

    /* Add core plugins to this instance */
    this.addPlugin('bubbles', handleBubbles);
    this.addPlugin('legend', addLegend);
    this.addPlugin('arc', handleArcs);
    this.addPlugin('labels', handleLabels);

    //append style block with basic hoverover styles
    if ( ! this.options.disableDefaultStyles ) {
      addStyleBlock();
    }

    return this.draw();
  }

  // actually draw the features(states & countries)
  Datamap.prototype.draw = function() {
    //save off in a closure
    var self = this;
    var options = self.options;

    //set projections and paths based on scope
    var pathAndProjection = options.setProjection.apply(self, [options.element, options] );

    this.path = pathAndProjection.path;
    this.projection = pathAndProjection.projection;

    //if custom URL for topojson data, retrieve it and render
    if ( options.geographyConfig.dataUrl ) {
      d3.json( options.geographyConfig.dataUrl, function(error, results) {
        if ( error ) throw new Error(error);
        self.customTopo = results;
        draw( results );
      });
    }
    else {
      draw( this[options.scope + 'Topo'] );
    }

    return this;

      function draw (data) {
        // if fetching remote data, draw the map first then call `updateChoropleth`
        if ( self.options.dataUrl ) {
          //allow for csv or json data types
          d3[self.options.dataType](self.options.dataUrl, function(data) {
            //in the case of csv, transform data to object
            if ( self.options.dataType === 'csv' && (data && data.slice) ) {
              var tmpData = {};
              for(var i = 0; i < data.length; i++) {
                tmpData[data[i].id] = data[i];
              } 
              data = tmpData;
            }
            Datamaps.prototype.updateChoropleth.call(self, data);
          });
        }
        drawSubunits.call(self, data);
        handleGeographyConfig.call(self);

        if ( self.options.geographyConfig.popupOnHover || self.options.bubblesConfig.popupOnHover) {
          hoverover = d3.select( self.options.element ).append('div')
            .attr('class', 'datamaps-hoverover')
            .style('z-index', 10001)
            .style('position', 'absolute');
        }

        //fire off finished callback
        self.options.done(self);
      }
  };
  /**************************************
                TopoJSON
  ***************************************/
  Datamap.prototype.worldTopo = {"type":"Topology","objects":{"world":{"type":"GeometryCollection","geometries":[{"type":"Polygon","properties":{"name":"Afghanistan"},"id":"AFG","arcs":[[0,1,2,3,4,5]]},{"type":"MultiPolygon","properties":{"name":"Angola"},"id":"AGO","arcs":[[[6,7,8,9]],[[10,11,12]]]},{"type":"Polygon","properties":{"name":"Albania"},"id":"ALB","arcs":[[13,14,15,16,17]]},{"type":"Polygon","properties":{"name":"United Arab Emirates"},"id":"ARE","arcs":[[18,19,20,21,22]]},{"type":"MultiPolygon","properties":{"name":"Argentina"},"id":"ARG","arcs":[[[23,24]],[[25,26,27,28,29,30]]]},{"type":"Polygon","properties":{"name":"Armenia"},"id":"ARM","arcs":[[31,32,33,34,35]]},{"type":"MultiPolygon","properties":{"name":"Antarctica"},"id":"ATA","arcs":[[[36]],[[37]],[[38]],[[39]],[[40]],[[41]],[[42]],[[43]]]},{"type":"Polygon","properties":{"name":"French Southern and Antarctic Lands"},"id":"ATF","arcs":[[44]]},{"type":"MultiPolygon","properties":{"name":"Australia"},"id":"AUS","arcs":[[[45]],[[46]]]},{"type":"Polygon","properties":{"name":"Austria"},"id":"AUT","arcs":[[47,48,49,50,51,52,53]]},{"type":"MultiPolygon","properties":{"name":"Azerbaijan"},"id":"AZE","arcs":[[[54,-35]],[[55,56,-33,57,58]]]},{"type":"Polygon","properties":{"name":"Burundi"},"id":"BDI","arcs":[[59,60,61]]},{"type":"Polygon","properties":{"name":"Belgium"},"id":"BEL","arcs":[[62,63,64,65,66]]},{"type":"Polygon","properties":{"name":"Benin"},"id":"BEN","arcs":[[67,68,69,70,71]]},{"type":"Polygon","properties":{"name":"Burkina Faso"},"id":"BFA","arcs":[[72,73,74,-70,75,76]]},{"type":"Polygon","properties":{"name":"Bangladesh"},"id":"BGD","arcs":[[77,78,79]]},{"type":"Polygon","properties":{"name":"Bulgaria"},"id":"BGR","arcs":[[80,81,82,83,84,85]]},{"type":"MultiPolygon","properties":{"name":"Bahamas"},"id":"BHS","arcs":[[[86]],[[87]],[[88]]]},{"type":"Polygon","properties":{"name":"Bosnia and Herzegovina"},"id":"BIH","arcs":[[89,90,91]]},{"type":"Polygon","properties":{"name":"Belarus"},"id":"BLR","arcs":[[92,93,94,95,96]]},{"type":"Polygon","properties":{"name":"Belize"},"id":"BLZ","arcs":[[97,98,99]]},{"type":"Polygon","properties":{"name":"Bolivia"},"id":"BOL","arcs":[[100,101,102,103,-31]]},{"type":"Polygon","properties":{"name":"Brazil"},"id":"BRA","arcs":[[-27,104,-103,105,106,107,108,109,110,111,112]]},{"type":"Polygon","properties":{"name":"Brunei Darussalam"},"id":"BRN","arcs":[[113,114]]},{"type":"Polygon","properties":{"name":"Bhutan"},"id":"BTN","arcs":[[115,116]]},{"type":"Polygon","properties":{"name":"Botswana"},"id":"BWA","arcs":[[117,118,119,120]]},{"type":"Polygon","properties":{"name":"Central African Republic"},"id":"CAF","arcs":[[121,122,123,124,125,126,127]]},{"type":"MultiPolygon","properties":{"name":"Canada"},"id":"CAN","arcs":[[[128]],[[129]],[[130]],[[131]],[[132]],[[133]],[[134]],[[135]],[[136]],[[137]],[[138,139,140,141]],[[142]],[[143]],[[144]],[[145]],[[146]],[[147]],[[148]],[[149]],[[150]],[[151]],[[152]],[[153]],[[154]],[[155]],[[156]],[[157]],[[158]],[[159]],[[160]]]},{"type":"Polygon","properties":{"name":"Switzerland"},"id":"CHE","arcs":[[-51,161,162,163]]},{"type":"MultiPolygon","properties":{"name":"Chile"},"id":"CHL","arcs":[[[-24,164]],[[-30,165,166,-101]]]},{"type":"MultiPolygon","properties":{"name":"China"},"id":"CHN","arcs":[[[167]],[[168,169,170,171,172,173,-117,174,175,176,177,-4,178,179,180,181,182,183]]]},{"type":"Polygon","properties":{"name":"Côte d'Ivoire"},"id":"CIV","arcs":[[184,185,186,187,-73,188]]},{"type":"Polygon","properties":{"name":"Cameroon"},"id":"CMR","arcs":[[189,190,191,192,193,194,-128,195]]},{"type":"Polygon","properties":{"name":"Democratic Republic of the Congo"},"id":"COD","arcs":[[196,197,-60,198,199,-10,200,-13,201,-126,202]]},{"type":"Polygon","properties":{"name":"Republic of Congo"},"id":"COG","arcs":[[-12,203,204,-196,-127,-202]]},{"type":"Polygon","properties":{"name":"Colombia"},"id":"COL","arcs":[[205,206,207,208,209,-107,210]]},{"type":"Polygon","properties":{"name":"Costa Rica"},"id":"CRI","arcs":[[211,212,213,214]]},{"type":"Polygon","properties":{"name":"Cuba"},"id":"CUB","arcs":[[215]]},{"type":"Polygon","properties":{"name":"Northern Cyprus"},"id":"-99","arcs":[[216,217]]},{"type":"Polygon","properties":{"name":"Cyprus"},"id":"CYP","arcs":[[218,-218]]},{"type":"Polygon","properties":{"name":"Czech Republic"},"id":"CZE","arcs":[[-53,219,220,221]]},{"type":"Polygon","properties":{"name":"Germany"},"id":"DEU","arcs":[[222,223,-220,-52,-164,224,225,-64,226,227,228]]},{"type":"Polygon","properties":{"name":"Djibouti"},"id":"DJI","arcs":[[229,230,231,232]]},{"type":"MultiPolygon","properties":{"name":"Denmark"},"id":"DNK","arcs":[[[233]],[[-229,234]]]},{"type":"Polygon","properties":{"name":"Dominican Republic"},"id":"DOM","arcs":[[235,236]]},{"type":"Polygon","properties":{"name":"Algeria"},"id":"DZA","arcs":[[237,238,239,240,241,242,243,244]]},{"type":"Polygon","properties":{"name":"Ecuador"},"id":"ECU","arcs":[[245,-206,246]]},{"type":"Polygon","properties":{"name":"Egypt"},"id":"EGY","arcs":[[247,248,249,250,251]]},{"type":"Polygon","properties":{"name":"Eritrea"},"id":"ERI","arcs":[[252,253,254,-233]]},{"type":"Polygon","properties":{"name":"Spain"},"id":"ESP","arcs":[[255,256,257,258]]},{"type":"Polygon","properties":{"name":"Estonia"},"id":"EST","arcs":[[259,260,261]]},{"type":"Polygon","properties":{"name":"Ethiopia"},"id":"ETH","arcs":[[-232,262,263,264,265,266,267,-253]]},{"type":"Polygon","properties":{"name":"Finland"},"id":"FIN","arcs":[[268,269,270,271]]},{"type":"MultiPolygon","properties":{"name":"Fiji"},"id":"FJI","arcs":[[[272]],[[273,274]],[[275,-275]]]},{"type":"Polygon","properties":{"name":"Falkland Islands"},"id":"FLK","arcs":[[276]]},{"type":"MultiPolygon","properties":{"name":"France"},"id":"FRA","arcs":[[[277,278,-111]],[[279]],[[280,-225,-163,281,282,-257,283,-66]]]},{"type":"Polygon","properties":{"name":"Gabon"},"id":"GAB","arcs":[[284,285,-190,-205]]},{"type":"MultiPolygon","properties":{"name":"United Kingdom"},"id":"GBR","arcs":[[[286,287]],[[288]]]},{"type":"Polygon","properties":{"name":"Georgia"},"id":"GEO","arcs":[[289,290,-58,-32,291]]},{"type":"Polygon","properties":{"name":"Ghana"},"id":"GHA","arcs":[[292,-189,-77,293]]},{"type":"Polygon","properties":{"name":"Guinea"},"id":"GIN","arcs":[[294,295,296,297,298,299,-187]]},{"type":"Polygon","properties":{"name":"The Gambia"},"id":"GMB","arcs":[[300,301]]},{"type":"Polygon","properties":{"name":"Guinea-Bissau"},"id":"GNB","arcs":[[302,303,-298]]},{"type":"Polygon","properties":{"name":"Equatorial Guinea"},"id":"GNQ","arcs":[[304,-191,-286]]},{"type":"MultiPolygon","properties":{"name":"Greece"},"id":"GRC","arcs":[[[305]],[[306,-15,307,-84,308]]]},{"type":"Polygon","properties":{"name":"Greenland"},"id":"GRL","arcs":[[309]]},{"type":"Polygon","properties":{"name":"Guatemala"},"id":"GTM","arcs":[[310,311,-100,312,313,314]]},{"type":"Polygon","properties":{"name":"Guyana"},"id":"GUY","arcs":[[315,316,-109,317]]},{"type":"Polygon","properties":{"name":"Honduras"},"id":"HND","arcs":[[318,319,-314,320,321]]},{"type":"Polygon","properties":{"name":"Croatia"},"id":"HRV","arcs":[[322,-92,323,324,325,326]]},{"type":"Polygon","properties":{"name":"Haiti"},"id":"HTI","arcs":[[-237,327]]},{"type":"Polygon","properties":{"name":"Hungary"},"id":"HUN","arcs":[[-48,328,329,330,331,-327,332]]},{"type":"MultiPolygon","properties":{"name":"Indonesia"},"id":"IDN","arcs":[[[333]],[[334,335]],[[336]],[[337]],[[338]],[[339]],[[340]],[[341]],[[342,343]],[[344]],[[345]],[[346,347]],[[348]]]},{"type":"Polygon","properties":{"name":"India"},"id":"IND","arcs":[[-177,349,-175,-116,-174,350,-80,351,352]]},{"type":"Polygon","properties":{"name":"Ireland"},"id":"IRL","arcs":[[353,-287]]},{"type":"Polygon","properties":{"name":"Iran"},"id":"IRN","arcs":[[354,-6,355,356,357,358,-55,-34,-57,359]]},{"type":"Polygon","properties":{"name":"Iraq"},"id":"IRQ","arcs":[[360,361,362,363,364,365,-358]]},{"type":"Polygon","properties":{"name":"Iceland"},"id":"ISL","arcs":[[366]]},{"type":"Polygon","properties":{"name":"Israel"},"id":"ISR","arcs":[[367,368,369,-252,370,371,372]]},{"type":"MultiPolygon","properties":{"name":"Italy"},"id":"ITA","arcs":[[[373]],[[374]],[[375,376,-282,-162,-50]]]},{"type":"Polygon","properties":{"name":"Jamaica"},"id":"JAM","arcs":[[377]]},{"type":"Polygon","properties":{"name":"Jordan"},"id":"JOR","arcs":[[-368,378,-364,379,380,-370,381]]},{"type":"MultiPolygon","properties":{"name":"Japan"},"id":"JPN","arcs":[[[382]],[[383]],[[384]]]},{"type":"Polygon","properties":{"name":"Kazakhstan"},"id":"KAZ","arcs":[[385,386,387,388,-181,389]]},{"type":"Polygon","properties":{"name":"Kenya"},"id":"KEN","arcs":[[390,391,392,393,-265,394]]},{"type":"Polygon","properties":{"name":"Kyrgyzstan"},"id":"KGZ","arcs":[[-390,-180,395,396]]},{"type":"Polygon","properties":{"name":"Cambodia"},"id":"KHM","arcs":[[397,398,399,400]]},{"type":"Polygon","properties":{"name":"Republic of Korea"},"id":"KOR","arcs":[[401,402]]},{"type":"Polygon","properties":{"name":"Kosovo"},"id":"-99","arcs":[[-18,403,404,405]]},{"type":"Polygon","properties":{"name":"Kuwait"},"id":"KWT","arcs":[[406,407,-362]]},{"type":"Polygon","properties":{"name":"Lao PDR"},"id":"LAO","arcs":[[408,409,-172,410,-399]]},{"type":"Polygon","properties":{"name":"Lebanon"},"id":"LBN","arcs":[[-372,411,412]]},{"type":"Polygon","properties":{"name":"Liberia"},"id":"LBR","arcs":[[413,414,-295,-186]]},{"type":"Polygon","properties":{"name":"Libya"},"id":"LBY","arcs":[[415,-245,416,417,-250,418,419]]},{"type":"Polygon","properties":{"name":"Sri Lanka"},"id":"LKA","arcs":[[420]]},{"type":"Polygon","properties":{"name":"Lesotho"},"id":"LSO","arcs":[[421]]},{"type":"Polygon","properties":{"name":"Lithuania"},"id":"LTU","arcs":[[422,423,424,-93,425]]},{"type":"Polygon","properties":{"name":"Luxembourg"},"id":"LUX","arcs":[[-226,-281,-65]]},{"type":"Polygon","properties":{"name":"Latvia"},"id":"LVA","arcs":[[426,-262,427,-94,-425]]},{"type":"Polygon","properties":{"name":"Morocco"},"id":"MAR","arcs":[[-242,428,429]]},{"type":"Polygon","properties":{"name":"Moldova"},"id":"MDA","arcs":[[430,431]]},{"type":"Polygon","properties":{"name":"Madagascar"},"id":"MDG","arcs":[[432]]},{"type":"Polygon","properties":{"name":"Mexico"},"id":"MEX","arcs":[[433,-98,-312,434,435]]},{"type":"Polygon","properties":{"name":"Macedonia"},"id":"MKD","arcs":[[-406,436,-85,-308,-14]]},{"type":"Polygon","properties":{"name":"Mali"},"id":"MLI","arcs":[[437,-239,438,-74,-188,-300,439]]},{"type":"Polygon","properties":{"name":"Myanmar"},"id":"MMR","arcs":[[440,-78,-351,-173,-410,441]]},{"type":"Polygon","properties":{"name":"Montenegro"},"id":"MNE","arcs":[[442,-324,-91,443,-404,-17]]},{"type":"Polygon","properties":{"name":"Mongolia"},"id":"MNG","arcs":[[444,-183]]},{"type":"Polygon","properties":{"name":"Mozambique"},"id":"MOZ","arcs":[[445,446,447,448,449,450,451,452]]},{"type":"Polygon","properties":{"name":"Mauritania"},"id":"MRT","arcs":[[453,454,455,-240,-438]]},{"type":"Polygon","properties":{"name":"Malawi"},"id":"MWI","arcs":[[-453,456,457]]},{"type":"MultiPolygon","properties":{"name":"Malaysia"},"id":"MYS","arcs":[[[458,459]],[[-347,460,-115,461]]]},{"type":"Polygon","properties":{"name":"Namibia"},"id":"NAM","arcs":[[462,-8,463,-119,464]]},{"type":"Polygon","properties":{"name":"New Caledonia"},"id":"NCL","arcs":[[465]]},{"type":"Polygon","properties":{"name":"Niger"},"id":"NER","arcs":[[-75,-439,-238,-416,466,-194,467,-71]]},{"type":"Polygon","properties":{"name":"Nigeria"},"id":"NGA","arcs":[[468,-72,-468,-193]]},{"type":"Polygon","properties":{"name":"Nicaragua"},"id":"NIC","arcs":[[469,-322,470,-213]]},{"type":"Polygon","properties":{"name":"Netherlands"},"id":"NLD","arcs":[[-227,-63,471]]},{"type":"MultiPolygon","properties":{"name":"Norway"},"id":"NOR","arcs":[[[472,-272,473,474]],[[475]],[[476]],[[477]]]},{"type":"Polygon","properties":{"name":"Nepal"},"id":"NPL","arcs":[[-350,-176]]},{"type":"MultiPolygon","properties":{"name":"New Zealand"},"id":"NZL","arcs":[[[478]],[[479]]]},{"type":"MultiPolygon","properties":{"name":"Oman"},"id":"OMN","arcs":[[[480,481,-22,482]],[[-20,483]]]},{"type":"Polygon","properties":{"name":"Pakistan"},"id":"PAK","arcs":[[-178,-353,484,-356,-5]]},{"type":"Polygon","properties":{"name":"Panama"},"id":"PAN","arcs":[[485,-215,486,-208]]},{"type":"Polygon","properties":{"name":"Peru"},"id":"PER","arcs":[[-167,487,-247,-211,-106,-102]]},{"type":"MultiPolygon","properties":{"name":"Philippines"},"id":"PHL","arcs":[[[488]],[[489]],[[490]],[[491]],[[492]],[[493]],[[494]]]},{"type":"MultiPolygon","properties":{"name":"Papua New Guinea"},"id":"PNG","arcs":[[[495]],[[496]],[[-343,497]],[[498]]]},{"type":"Polygon","properties":{"name":"Poland"},"id":"POL","arcs":[[-224,499,500,-426,-97,501,502,-221]]},{"type":"Polygon","properties":{"name":"Puerto Rico"},"id":"PRI","arcs":[[503]]},{"type":"Polygon","properties":{"name":"Dem. Rep. Korea"},"id":"PRK","arcs":[[504,505,-403,506,-169]]},{"type":"Polygon","properties":{"name":"Portugal"},"id":"PRT","arcs":[[-259,507]]},{"type":"Polygon","properties":{"name":"Paraguay"},"id":"PRY","arcs":[[-104,-105,-26]]},{"type":"Polygon","properties":{"name":"Palestine"},"id":"PSE","arcs":[[-382,-369]]},{"type":"Polygon","properties":{"name":"Qatar"},"id":"QAT","arcs":[[508,509]]},{"type":"Polygon","properties":{"name":"Romania"},"id":"ROU","arcs":[[510,-432,511,512,-81,513,-331]]},{"type":"MultiPolygon","properties":{"name":"Russian Federation"},"id":"RUS","arcs":[[[514]],[[-501,515,-423]],[[516,517]],[[518]],[[519]],[[520]],[[521]],[[522]],[[523]],[[524,-505,-184,-445,-182,-389,525,-59,-291,526,527,-95,-428,-261,528,-269,-473,529,-518]],[[530]],[[531]],[[532]]]},{"type":"Polygon","properties":{"name":"Rwanda"},"id":"RWA","arcs":[[533,-61,-198,534]]},{"type":"Polygon","properties":{"name":"Western Sahara"},"id":"ESH","arcs":[[-241,-456,535,-429]]},{"type":"Polygon","properties":{"name":"Saudi Arabia"},"id":"SAU","arcs":[[536,-380,-363,-408,537,-510,538,-23,-482,539]]},{"type":"Polygon","properties":{"name":"Sudan"},"id":"SDN","arcs":[[540,541,-123,542,-419,-249,543,-254,-268,544]]},{"type":"Polygon","properties":{"name":"South Sudan"},"id":"SSD","arcs":[[545,-266,-394,546,-203,-125,547,-541]]},{"type":"Polygon","properties":{"name":"Senegal"},"id":"SEN","arcs":[[548,-454,-440,-299,-304,549,-302]]},{"type":"MultiPolygon","properties":{"name":"Solomon Islands"},"id":"SLB","arcs":[[[550]],[[551]],[[552]],[[553]],[[554]]]},{"type":"Polygon","properties":{"name":"Sierra Leone"},"id":"SLE","arcs":[[555,-296,-415]]},{"type":"Polygon","properties":{"name":"El Salvador"},"id":"SLV","arcs":[[556,-315,-320]]},{"type":"Polygon","properties":{"name":"Somaliland"},"id":"-99","arcs":[[-263,-231,557,558]]},{"type":"Polygon","properties":{"name":"Somalia"},"id":"SOM","arcs":[[-395,-264,-559,559]]},{"type":"Polygon","properties":{"name":"Serbia"},"id":"SRB","arcs":[[-86,-437,-405,-444,-90,-323,-332,-514]]},{"type":"Polygon","properties":{"name":"Suriname"},"id":"SUR","arcs":[[560,-278,-110,-317]]},{"type":"Polygon","properties":{"name":"Slovakia"},"id":"SVK","arcs":[[-503,561,-329,-54,-222]]},{"type":"Polygon","properties":{"name":"Slovenia"},"id":"SVN","arcs":[[-49,-333,-326,562,-376]]},{"type":"Polygon","properties":{"name":"Sweden"},"id":"SWE","arcs":[[-474,-271,563]]},{"type":"Polygon","properties":{"name":"Swaziland"},"id":"SWZ","arcs":[[564,-449]]},{"type":"Polygon","properties":{"name":"Syria"},"id":"SYR","arcs":[[-379,-373,-413,565,566,-365]]},{"type":"Polygon","properties":{"name":"Chad"},"id":"TCD","arcs":[[-467,-420,-543,-122,-195]]},{"type":"Polygon","properties":{"name":"Togo"},"id":"TGO","arcs":[[567,-294,-76,-69]]},{"type":"Polygon","properties":{"name":"Thailand"},"id":"THA","arcs":[[568,-460,569,-442,-409,-398]]},{"type":"Polygon","properties":{"name":"Tajikistan"},"id":"TJK","arcs":[[-396,-179,-3,570]]},{"type":"Polygon","properties":{"name":"Turkmenistan"},"id":"TKM","arcs":[[-355,571,-387,572,-1]]},{"type":"Polygon","properties":{"name":"Timor-Leste"},"id":"TLS","arcs":[[573,-335]]},{"type":"Polygon","properties":{"name":"Trinidad and Tobago"},"id":"TTO","arcs":[[574]]},{"type":"Polygon","properties":{"name":"Tunisia"},"id":"TUN","arcs":[[-244,575,-417]]},{"type":"MultiPolygon","properties":{"name":"Turkey"},"id":"TUR","arcs":[[[-292,-36,-359,-366,-567,576]],[[-309,-83,577]]]},{"type":"Polygon","properties":{"name":"Taiwan"},"id":"TWN","arcs":[[578]]},{"type":"Polygon","properties":{"name":"Tanzania"},"id":"TZA","arcs":[[-392,579,-446,-458,580,-199,-62,-534,581]]},{"type":"Polygon","properties":{"name":"Uganda"},"id":"UGA","arcs":[[-535,-197,-547,-393,-582]]},{"type":"Polygon","properties":{"name":"Ukraine"},"id":"UKR","arcs":[[-528,582,-512,-431,-511,-330,-562,-502,-96]]},{"type":"Polygon","properties":{"name":"Uruguay"},"id":"URY","arcs":[[-113,583,-28]]},{"type":"MultiPolygon","properties":{"name":"United States"},"id":"USA","arcs":[[[584]],[[585]],[[586]],[[587]],[[588]],[[589,-436,590,-139]],[[591]],[[592]],[[593]],[[-141,594]]]},{"type":"Polygon","properties":{"name":"Uzbekistan"},"id":"UZB","arcs":[[-573,-386,-397,-571,-2]]},{"type":"Polygon","properties":{"name":"Venezuela"},"id":"VEN","arcs":[[595,-318,-108,-210]]},{"type":"Polygon","properties":{"name":"Vietnam"},"id":"VNM","arcs":[[596,-400,-411,-171]]},{"type":"MultiPolygon","properties":{"name":"Vanuatu"},"id":"VUT","arcs":[[[597]],[[598]]]},{"type":"Polygon","properties":{"name":"Yemen"},"id":"YEM","arcs":[[599,-540,-481]]},{"type":"Polygon","properties":{"name":"South Africa"},"id":"ZAF","arcs":[[-465,-118,600,-450,-565,-448,601],[-422]]},{"type":"Polygon","properties":{"name":"Zambia"},"id":"ZMB","arcs":[[-457,-452,602,-120,-464,-7,-200,-581]]},{"type":"Polygon","properties":{"name":"Zimbabwe"},"id":"ZWE","arcs":[[-601,-121,-603,-451]]}]}},"arcs":[[[6700,7235],[28,-22],[21,8],[6,26],[22,9],[15,17],[6,46],[23,12],[5,20],[13,-15],[8,-2]],[[6847,7334],[16,0],[20,-13]],[[6883,7321],[9,-7],[20,19],[9,-11],[9,26],[17,-1],[4,8],[3,24],[12,20],[15,-13],[-3,-18],[9,-3],[-3,-48],[11,-19],[10,12],[12,6],[17,26],[19,-5],[29,0]],[[7082,7337],[5,-16]],[[7087,7321],[-16,-7],[-14,-10],[-32,-7],[-30,-12],[-16,-25],[6,-25],[4,-28],[-14,-24],[1,-23],[-8,-20],[-26,1],[11,-38],[-18,-14],[-12,-35],[2,-35],[-11,-16],[-10,6],[-22,-8],[-3,-16],[-20,0],[-16,-32],[-1,-49],[-36,-24],[-19,5],[-6,-13],[-16,7],[-28,-8],[-47,29]],[[6690,6900],[25,52],[-2,37],[-21,10],[-2,37],[-9,46],[12,31],[-12,9],[7,42],[12,71]],[[5664,4553],[3,-18],[-4,-28],[5,-27],[-4,-21],[3,-20],[-58,1],[-2,-183],[19,-48],[18,-36]],[[5644,4173],[-51,-23],[-67,8],[-19,28],[-113,-3],[-4,-4],[-17,26],[-18,2],[-16,-10],[-14,-11]],[[5325,4186],[-2,36],[4,51],[9,53],[2,24],[9,52],[6,24],[16,38],[9,25],[3,43],[-1,33],[-9,20],[-7,35],[-7,35],[2,12],[8,22],[-8,56],[-6,39],[-14,36],[3,11]],[[5342,4831],[11,8],[8,-1],[10,7],[82,-1],[7,-43],[8,-34],[6,-19],[11,-30],[18,5],[9,8],[16,-9],[4,15],[7,33],[17,3],[2,10],[14,0],[-3,-21],[34,1],[1,-37],[5,-22],[-4,-35],[2,-35],[9,-21],[-1,-69],[7,5],[12,-1],[17,9],[13,-4]],[[5338,4849],[-8,43]],[[5330,4892],[12,25],[8,10],[10,-20]],[[5360,4907],[-10,-12],[-4,-15],[-1,-25],[-7,-6]],[[5571,7593],[-3,-20],[4,-25],[11,-14]],[[5583,7534],[0,-15],[-9,-8],[-2,-19],[-13,-28]],[[5559,7464],[-5,4],[0,13],[-15,19],[-3,28],[2,39],[4,18],[-4,9]],[[5538,7594],[-2,18],[12,29],[1,-11],[8,5]],[[5557,7635],[6,-16],[7,-6],[1,-20]],[[6432,6579],[5,2],[1,-15],[22,9],[23,-2],[17,-2],[19,39],[20,37],[18,36]],[[6557,6683],[5,-20]],[[6562,6663],[4,-45]],[[6566,6618],[-14,-1],[-3,-37],[5,-8],[-12,-11],[0,-24],[-8,-24],[-1,-23]],[[6533,6490],[-6,-12],[-83,29],[-11,58],[-1,14]],[[3140,2021],[-17,2],[-30,0],[0,129]],[[3093,2152],[11,-27],[14,-43],[36,-35],[39,-14],[-13,-29],[-26,-3],[-14,20]],[[3258,3901],[51,-94],[23,-8],[34,-43],[29,-22],[4,-26],[-28,-87],[28,-16],[32,-9],[22,9],[25,45],[4,50]],[[3482,3700],[14,11],[14,-33],[-1,-46],[-23,-32],[-19,-23],[-31,-56],[-37,-78]],[[3399,3443],[-7,-47],[-7,-59],[0,-57],[-6,-13],[-2,-37]],[[3377,3230],[-2,-30],[35,-50],[-4,-39],[18,-25],[-2,-28],[-26,-74],[-42,-31],[-55,-12],[-31,6],[6,-35],[-6,-43],[5,-29],[-16,-20],[-29,-8],[-26,21],[-11,-15],[4,-57],[18,-18],[16,18],[8,-29],[-26,-18],[-22,-36],[-4,-58],[-7,-31],[-26,0],[-22,-30],[-8,-43],[28,-42],[26,-12],[-9,-51],[-33,-33],[-18,-67],[-25,-23],[-12,-27],[9,-60],[19,-33],[-12,3]],[[3095,2171],[-26,9],[-67,8],[-11,33],[0,43],[-18,-3],[-10,21],[-3,61],[22,25],[9,36],[-4,30],[15,49],[10,76],[-3,34],[12,11],[-3,21],[-13,12],[10,24],[-13,22],[-6,66],[11,12],[-5,70],[7,59],[7,52],[17,20],[-9,57],[0,53],[21,37],[-1,48],[16,56],[0,53],[-7,11],[-13,99],[17,60],[-2,55],[10,53],[18,54],[20,36],[-9,22],[6,19],[-1,96],[30,28],[10,60],[-3,14]],[[3136,3873],[23,52],[36,-14],[16,-41],[11,46],[32,-2],[4,-13]],[[6210,7549],[39,9]],[[6249,7558],[5,-15],[11,-10],[-6,-15],[15,-20],[-8,-18],[12,-16],[13,-9],[0,-40]],[[6291,7415],[-10,-2]],[[6281,7413],[-11,34],[0,8],[-12,0],[-9,16],[-5,-2]],[[6244,7469],[-11,17],[-21,14],[3,28],[-5,21]],[[3345,574],[-8,-30],[-8,-26],[-59,8],[-62,-3],[-34,19],[0,2],[-16,17],[63,-2],[60,-6],[20,24],[15,20],[29,-23]],[[577,605],[-53,-8],[-36,20],[-17,21],[-1,3],[-18,16],[17,21],[52,-9],[28,-18],[21,-20],[7,-26]],[[3745,688],[35,-25],[12,-35],[3,-24],[1,-30],[-43,-18],[-45,-14],[-52,-14],[-59,-11],[-65,3],[-37,19],[5,24],[59,16],[24,19],[18,25],[12,21],[17,21],[18,23],[14,0],[41,13],[42,-13]],[[1633,950],[36,-9],[33,10],[-16,-20],[-26,-15],[-39,5],[-27,20],[6,19],[33,-10]],[[1512,951],[43,-22],[-17,2],[-36,6],[-38,15],[20,13],[28,-14]],[[2250,1040],[31,-8],[30,7],[17,-33],[-22,5],[-34,-2],[-34,2],[-38,-3],[-28,11],[-15,24],[18,10],[35,-8],[40,-5]],[[3098,1097],[4,-26],[-5,-23],[-8,-21],[-33,-8],[-31,-12],[-36,2],[14,22],[-33,-8],[-31,-8],[-21,17],[-2,24],[30,23],[20,6],[32,-2],[8,29],[1,22],[0,46],[16,27],[25,9],[15,-21],[6,-22],[12,-26],[10,-24],[7,-26]],[[0,304],[2,0],[24,33],[50,-18],[3,2],[30,19],[4,-1],[3,0],[40,-24],[35,24],[7,3],[81,10],[27,-13],[13,-7],[41,-19],[79,-15],[63,-18],[107,-14],[80,16],[118,-11],[67,-18],[73,17],[78,16],[6,27],[-110,2],[-89,13],[-24,23],[-74,12],[5,26],[10,24],[10,22],[-5,23],[-46,16],[-22,20],[-43,18],[68,-3],[64,9],[40,-19],[50,17],[45,21],[23,19],[-10,24],[-36,16],[-41,17],[-57,3],[-50,8],[-54,6],[-18,21],[-36,18],[-21,21],[-9,65],[14,-6],[25,-18],[45,6],[44,8],[23,-25],[44,6],[37,12],[35,16],[32,19],[41,6],[-1,21],[-9,22],[8,20],[36,10],[16,-19],[42,11],[32,15],[40,1],[38,6],[37,13],[30,12],[34,13],[22,-3],[19,-5],[41,8],[37,-10],[38,1],[37,8],[37,-6],[41,-6],[39,3],[40,-1],[42,-2],[38,3],[28,17],[34,9],[35,-13],[33,10],[30,21],[18,-18],[9,-21],[18,-19],[29,17],[33,-21],[38,-7],[32,-16],[39,4],[36,10],[41,-3],[38,-7],[38,-11],[15,25],[-18,19],[-14,21],[-36,4],[-15,22],[-6,21],[-10,43],[21,-8],[36,-3],[36,3],[33,-9],[28,-17],[12,-20],[38,-4],[36,8],[38,12],[34,6],[28,-13],[37,4],[24,44],[23,-26],[32,-10],[34,6],[23,-23],[37,-2],[33,-7],[34,-12],[21,21],[11,21],[28,-23],[38,6],[28,-13],[19,-19],[37,6],[29,12],[29,15],[33,8],[39,6],[36,8],[27,13],[16,18],[7,25],[-3,23],[-9,23],[-10,22],[-9,23],[-7,20],[-1,23],[2,22],[13,22],[11,24],[5,22],[-6,25],[-3,23],[14,26],[15,16],[18,22],[19,18],[22,17],[11,25],[15,16],[18,14],[26,4],[18,18],[19,11],[23,7],[20,14],[16,18],[22,7],[16,-15],[-10,-19],[-29,-17],[-11,-12],[-21,9],[-23,-6],[-19,-13],[-20,-15],[-14,-17],[-4,-22],[2,-22],[13,-19],[-19,-14],[-26,-4],[-15,-19],[-17,-18],[-17,-25],[-4,-22],[9,-23],[15,-18],[23,-14],[21,-18],[12,-22],[6,-22],[8,-22],[13,-20],[8,-21],[4,-53],[8,-22],[2,-22],[9,-23],[-4,-30],[-15,-24],[-17,-19],[-37,-8],[-12,-20],[-17,-19],[-42,-22],[-37,-9],[-35,-12],[-37,-13],[-22,-23],[-45,-3],[-49,3],[-44,-5],[-47,0],[9,-22],[42,-11],[31,-15],[18,-21],[-31,-18],[-48,6],[-40,-15],[-2,-23],[-1,-23],[33,-19],[6,-22],[35,-21],[59,-9],[50,-16],[40,-18],[50,-18],[70,-9],[68,-16],[47,-17],[52,-19],[27,-27],[13,-21],[34,20],[46,17],[48,18],[58,14],[49,16],[69,1],[68,-8],[56,-13],[18,25],[39,17],[70,1],[55,12],[52,13],[58,8],[62,10],[43,14],[-20,21],[-12,20],[0,21],[-54,-2],[-57,-9],[-54,0],[-8,22],[4,42],[12,13],[40,13],[47,14],[34,17],[33,17],[25,22],[38,11],[38,7],[19,5],[43,2],[41,8],[34,11],[34,14],[30,13],[39,19],[24,19],[26,17],[9,22],[-30,14],[10,23],[18,18],[29,12],[31,13],[28,18],[22,23],[13,27],[21,16],[33,-4],[13,-19],[34,-2],[1,21],[14,23],[30,-6],[7,-21],[33,-3],[36,10],[35,6],[31,-3],[12,-24],[31,20],[28,10],[31,8],[31,7],[29,14],[31,9],[24,12],[17,21],[20,-15],[29,8],[20,-27],[16,-20],[32,11],[12,22],[28,16],[37,-3],[11,-22],[22,22],[30,7],[33,2],[29,-1],[31,-7],[30,-3],[13,-20],[18,-16],[31,10],[32,2],[32,0],[31,1],[28,8],[29,7],[25,16],[26,10],[28,5],[21,16],[15,32],[16,19],[29,-9],[11,-20],[24,-14],[29,5],[19,-21],[21,-14],[28,13],[10,25],[25,10],[29,19],[27,8],[33,11],[22,13],[22,13],[22,13],[26,-7],[25,20],[18,16],[26,-1],[23,14],[6,20],[23,16],[23,11],[28,9],[25,4],[25,-3],[26,-6],[22,-15],[3,-25],[24,-19],[17,-16],[33,-7],[19,-16],[23,-16],[26,-3],[23,11],[24,24],[26,-12],[27,-7],[26,-7],[27,-4],[28,0],[23,-60],[-1,-15],[-4,-26],[-26,-14],[-22,-22],[4,-22],[31,1],[-4,-23],[-14,-21],[-13,-24],[21,-18],[32,-6],[32,10],[15,23],[10,21],[15,18],[17,17],[7,21],[15,28],[18,6],[31,2],[28,7],[28,9],[14,22],[8,22],[19,21],[27,15],[23,11],[16,19],[15,10],[21,9],[27,-5],[25,5],[28,7],[30,-3],[20,16],[14,38],[11,-16],[13,-27],[23,-11],[27,-5],[26,7],[29,-5],[26,-1],[17,6],[24,-3],[21,-13],[25,8],[30,0],[25,8],[29,-8],[19,19],[14,19],[19,16],[35,43],[18,-8],[21,-16],[18,-20],[36,-35],[27,-1],[25,0],[30,7],[30,8],[23,15],[19,17],[31,3],[21,12],[22,-11],[14,-18],[19,-18],[31,2],[19,-15],[33,-14],[35,-6],[29,4],[21,19],[19,18],[25,4],[25,-8],[29,-5],[26,9],[25,0],[24,-6],[26,-6],[25,10],[30,9],[28,3],[32,0],[25,5],[25,5],[8,28],[1,24],[17,-16],[5,-26],[10,-24],[11,-19],[23,-10],[32,3],[36,2],[25,3],[37,0],[26,1],[36,-2],[31,-5],[20,-18],[-5,-21],[18,-17],[30,-14],[31,-14],[35,-10],[38,-10],[28,-9],[32,-1],[18,20],[24,-16],[21,-18],[25,-14],[34,-6],[32,-6],[13,-23],[32,-13],[21,-21],[31,-9],[32,1],[30,-3],[33,1],[34,-4],[31,-8],[28,-14],[29,-11],[20,-17],[-3,-23],[-15,-20],[-13,-26],[-9,-20],[-14,-24],[-36,-9],[-16,-20],[-36,-13],[-13,-22],[-19,-22],[-20,-18],[-11,-23],[-7,-22],[-3,-26],[0,-21],[16,-23],[6,-21],[13,-21],[52,-7],[11,-25],[-50,-9],[-43,-13],[-52,-2],[-24,-33],[-5,-27],[-12,-21],[-14,-22],[37,-19],[14,-23],[24,-22],[33,-19],[39,-18],[42,-18],[64,-18],[14,-28],[80,-13],[5,-4],[21,-17],[77,14],[63,-18],[-9951,-14]],[[6914,2382],[18,-18],[26,-7],[1,-11],[-7,-26],[-43,-4],[-1,31],[4,24],[2,11]],[[9038,2834],[27,-20],[15,8],[22,11],[16,-4],[2,-69],[-9,-19],[-3,-47],[-10,16],[-19,-40],[-6,3],[-17,2],[-17,49],[-4,38],[-16,50],[1,27],[18,-5]],[[8987,4390],[10,-45],[18,21],[9,-24],[13,-22],[-3,-26],[6,-49],[5,-29],[7,-7],[7,-49],[-3,-30],[9,-39],[31,-30],[19,-28],[19,-25],[-4,-14],[16,-36],[11,-62],[11,13],[11,-25],[7,8],[5,-61],[19,-35],[13,-22],[22,-47],[8,-46],[1,-33],[-2,-35],[13,-49],[-2,-51],[-5,-27],[-7,-51],[1,-33],[-6,-41],[-12,-53],[-21,-28],[-10,-45],[-9,-28],[-8,-50],[-11,-29],[-7,-43],[-4,-39],[2,-19],[-16,-20],[-31,-2],[-26,-23],[-13,-23],[-17,-24],[-23,25],[-17,10],[5,30],[-15,-11],[-25,-41],[-24,15],[-15,9],[-16,5],[-27,16],[-18,36],[-5,43],[-7,30],[-13,23],[-27,7],[9,28],[-7,42],[-13,-39],[-25,-11],[14,32],[5,33],[10,28],[-2,43],[-22,-49],[-18,-20],[-10,-46],[-22,24],[1,31],[-18,41],[-14,22],[5,13],[-36,35],[-19,2],[-27,28],[-50,-6],[-36,-20],[-31,-19],[-27,3],[-29,-29],[-24,-13],[-6,-31],[-10,-23],[-23,-1],[-18,-6],[-24,11],[-20,-6],[-19,-3],[-17,-31],[-8,3],[-14,-16],[-13,-19],[-21,3],[-18,0],[-30,36],[-15,11],[1,33],[14,8],[4,13],[-1,21],[4,40],[-3,34],[-15,58],[-4,33],[1,33],[-11,37],[-1,17],[-12,23],[-4,45],[-16,46],[-4,25],[13,-25],[-10,53],[14,-17],[8,-22],[0,30],[-14,45],[-3,18],[-6,17],[3,34],[6,14],[4,29],[-3,33],[11,42],[2,-44],[12,39],[22,20],[14,24],[21,21],[13,5],[7,-7],[22,21],[17,7],[4,12],[8,6],[15,-2],[29,17],[15,26],[7,30],[17,30],[1,23],[1,31],[19,49],[12,-50],[12,12],[-10,27],[9,28],[12,-13],[3,44],[15,28],[7,23],[14,10],[0,16],[13,-7],[0,15],[12,8],[14,8],[20,-27],[16,-34],[17,0],[18,-6],[-6,32],[13,46],[13,15],[-5,15],[12,33],[17,20],[14,-7],[24,11],[-1,29],[-20,19],[15,9],[18,-15],[15,-23],[23,-15],[8,6],[17,-18],[17,17],[10,-5],[7,11],[12,-29],[-7,-31],[-11,-23],[-9,-2],[3,-23],[-8,-29],[-10,-28],[2,-16],[22,-32],[21,-18],[15,-20],[20,-34],[8,0],[14,-15],[4,-18],[27,-19],[18,19],[6,31],[5,26],[4,31],[8,46],[-4,28],[2,17],[-3,33],[4,43],[5,12],[-4,19],[7,31],[5,31],[1,17],[10,21],[8,-28],[2,-36],[7,-7],[1,-24],[10,-30],[2,-32],[-1,-21]],[[5471,7954],[-2,-24],[-16,0],[6,-13],[-9,-37]],[[5450,7880],[-6,-9],[-24,-2],[-14,-13],[-23,5]],[[5383,7861],[-40,14],[-6,21],[-27,-10],[-4,-11],[-16,8]],[[5290,7883],[-15,1],[-12,11],[4,14],[-1,10]],[[5266,7919],[8,3],[14,-16],[4,15],[25,-2],[20,10],[13,-1],[9,-12],[2,10],[-4,37],[10,7],[10,27]],[[5377,7997],[21,-19],[15,24],[10,4],[22,-17],[13,3],[13,-11]],[[5471,7981],[-3,-7],[3,-20]],[[6281,7413],[-19,8],[-14,27],[-4,21]],[[6349,7590],[15,-30],[14,-41],[13,-3],[8,-15],[-23,-5],[-5,-45],[-4,-20],[-11,-13],[1,-29]],[[6357,7389],[-7,-3],[-17,30],[10,29],[-9,17],[-10,-5],[-33,-42]],[[6249,7558],[6,9],[21,-16],[15,-4],[4,7],[-14,31],[7,8]],[[6288,7593],[8,-2],[19,-35],[13,-4],[4,15],[17,23]],[[5814,4923],[-1,70],[-7,26]],[[5806,5019],[17,-5],[8,33],[15,-4]],[[5846,5043],[1,-22],[6,-13],[1,-19],[-7,-12],[-11,-30],[-10,-21],[-12,-3]],[[5092,8139],[20,-4],[26,12],[17,-26],[16,-13]],[[5171,8108],[-4,-39]],[[5167,8069],[-7,-2],[-3,-32]],[[5157,8035],[-24,26],[-14,-5],[-20,27],[-13,24],[-13,0],[-4,21]],[[5069,8128],[23,11]],[[5074,5543],[-23,-7]],[[5051,5536],[-7,40],[2,132],[-6,12],[-1,28],[-10,20],[-8,17],[3,31]],[[5024,5816],[10,6],[6,25],[13,6],[6,17]],[[5059,5870],[10,17],[10,0],[21,-33]],[[5100,5854],[-1,-19],[6,-34],[-6,-24],[3,-15],[-13,-36],[-9,-17],[-5,-37],[1,-36],[-2,-93]],[[4921,5738],[-19,15],[-13,-3],[-10,-14],[-12,12],[-5,19],[-13,13]],[[4849,5780],[-1,33],[7,24],[-1,20],[23,48],[4,39],[7,14],[14,-8],[11,12],[4,15],[22,26],[5,18],[26,24],[15,8],[7,-11],[18,0]],[[5010,6042],[-2,-28],[3,-26],[16,-38],[1,-27],[32,-14],[-1,-39]],[[5024,5816],[-24,1]],[[5000,5817],[-13,5],[-9,-10],[-12,4],[-48,-2],[-1,-33],[4,-43]],[[7573,6452],[0,-42],[-10,9],[2,-46]],[[7565,6373],[-8,30],[-1,29],[-6,28],[-11,33],[-26,3],[3,-24],[-9,-32],[-12,12],[-4,-11],[-8,6],[-11,5]],[[7472,6452],[-4,48],[-10,43],[5,35],[-17,15],[6,21],[18,22],[-20,30],[9,39],[22,-25],[14,-2],[2,-40],[26,-8],[26,1],[16,-10],[-13,-49],[-12,-3],[-9,-33],[16,-30],[4,37],[8,0],[14,-91]],[[5629,7730],[8,-24],[11,4],[21,-9],[41,-3],[13,15],[33,13],[20,-21],[17,-6]],[[5793,7699],[-15,-24],[-10,-41],[9,-33]],[[5777,7601],[-24,8],[-28,-18]],[[5725,7591],[0,-29],[-26,-5],[-19,20],[-22,-16],[-21,2]],[[5637,7563],[-2,38],[-14,18]],[[5621,7619],[5,9],[-3,6],[4,19],[11,18],[-14,25],[-2,21],[7,13]],[[2846,6551],[-7,-3],[-7,33],[-10,17],[6,36],[8,-2],[10,-48],[0,-33]],[[2838,6713],[-30,-9],[-2,21],[13,5],[18,-2],[1,-15]],[[2861,6714],[-5,-41],[-5,7],[0,30],[-12,23],[0,7],[22,-26]],[[5527,7766],[10,0],[-7,-26],[14,-22],[-4,-27],[-7,-2]],[[5533,7689],[-5,-6],[-9,-13],[-4,-32]],[[5515,7638],[-25,22],[-10,24],[-11,13],[-12,21],[-6,18],[-14,27],[6,24],[10,-13],[6,12],[13,1],[24,-9],[19,0],[12,-12]],[[5652,8287],[27,0],[30,21],[6,33],[23,18],[-3,26]],[[5735,8385],[17,10],[30,22]],[[5782,8417],[29,-15],[4,-14],[15,7],[27,-14],[3,-27],[-6,-15],[17,-38],[12,-11],[-2,-10],[19,-10],[8,-15],[-11,-13],[-23,2],[-5,-5],[7,-19],[6,-37]],[[5882,8183],[-23,-4],[-9,-12],[-2,-29],[-11,5],[-25,-3],[-7,14],[-11,-10],[-10,8],[-22,1],[-31,14],[-28,5],[-22,-2],[-15,-15],[-13,-2]],[[5653,8153],[-1,25],[-8,27],[17,12],[0,23],[-8,21],[-1,26]],[[2524,6208],[-1,8],[4,3],[5,-7],[10,35],[5,1]],[[2547,6248],[0,-9],[5,0],[0,-16],[-5,-25],[3,-8],[-3,-21],[2,-6],[-4,-29],[-5,-15],[-5,-2],[-6,-20]],[[2529,6097],[-8,0],[2,65],[1,46]],[[3136,3873],[-20,-8],[-11,80],[-15,64],[9,56],[-15,24],[-4,42],[-13,39]],[[3067,4170],[17,62],[-12,49],[7,19],[-5,21],[10,29],[1,49],[1,41],[6,19],[-24,93]],[[3068,4552],[21,-5],[14,1],[6,18],[25,23],[14,22],[37,9],[-3,-43],[3,-22],[-2,-39],[30,-51],[31,-10],[11,-21],[19,-12],[11,-16],[18,0],[16,-17],[1,-33],[6,-17],[0,-25],[-8,-1],[11,-67],[53,-2],[-4,-33],[3,-23],[15,-16],[6,-36],[-4,-45],[-8,-26],[3,-32],[-9,-12]],[[3384,4021],[-1,17],[-25,30],[-26,1],[-49,-17],[-13,-51],[-1,-31],[-11,-69]],[[3482,3700],[6,34],[3,34],[1,31],[-10,11],[-11,-10],[-10,3],[-4,22],[-2,53],[-5,17],[-19,16],[-11,-12],[-30,11],[2,79],[-8,32]],[[3068,4552],[-15,-10],[-13,7],[2,87],[-23,-34],[-24,2],[-11,30],[-18,4],[5,24],[-15,35],[-11,52],[7,11],[0,24],[17,17],[-3,31],[7,20],[2,27],[32,39],[22,11],[4,9],[25,-3]],[[3058,4935],[13,158],[0,25],[-4,33],[-12,21],[0,42],[15,9],[6,-6],[1,22],[-16,6],[-1,36],[54,-1],[10,20],[7,-18],[6,-34],[5,7]],[[3142,5255],[15,-31],[22,4],[5,18],[21,13],[11,9],[4,25],[19,16],[-1,12],[-24,5],[-3,37],[1,38],[-13,15],[5,5],[21,-7],[22,-14],[8,13],[20,9],[31,22],[10,22],[-3,16]],[[3313,5482],[14,2],[7,-13],[-4,-25],[9,-9],[7,-27],[-8,-20],[-4,-49],[7,-29],[2,-27],[17,-27],[14,-3],[3,12],[8,2],[13,10],[9,16],[15,-5],[7,2]],[[3429,5292],[15,-5],[3,12],[-5,11],[3,17],[11,-5],[13,6],[16,-12]],[[3485,5316],[12,-12],[9,15],[6,-2],[4,-16],[13,4],[11,22],[8,42],[17,53]],[[3565,5422],[9,3],[7,-32],[16,-101],[14,-10],[1,-39],[-21,-48],[9,-17],[49,-9],[1,-58],[21,38],[35,-21],[46,-35],[14,-34],[-5,-32],[33,18],[54,-30],[41,2],[41,-48],[36,-64],[21,-17],[24,-2],[10,-18],[9,-74],[5,-34],[-11,-96],[-14,-37],[-39,-80],[-18,-65],[-21,-50],[-7,-1],[-7,-43],[2,-108],[-8,-88],[-3,-38],[-9,-23],[-5,-77],[-28,-75],[-5,-60],[-22,-25],[-7,-34],[-30,0],[-44,-22],[-19,-26],[-31,-17],[-33,-45],[-23,-58],[-5,-43],[5,-31],[-5,-59],[-6,-28],[-20,-31],[-31,-102],[-24,-45],[-19,-27],[-13,-55],[-18,-33]],[[3517,3238],[-8,33],[13,27],[-16,39],[-22,32],[-29,37],[-10,-2],[-28,45],[-18,-6]],[[8172,5443],[11,22],[23,31]],[[8206,5496],[-1,-28],[-2,-37],[-13,2],[-6,-20],[-12,30]],[[7546,6782],[12,-19],[-2,-35],[-23,-2],[-23,4],[-18,-9],[-25,22],[-1,11]],[[7466,6754],[19,43],[15,15],[20,-13],[14,-2],[12,-15]],[[5817,3910],[-39,-42],[-25,-43],[-10,-38],[-8,-22],[-15,-5],[-5,-27],[-3,-18],[-17,-14],[-23,3],[-13,16],[-12,7],[-14,-13],[-6,-28],[-14,-17],[-13,-26],[-20,-5],[-6,20],[2,35],[-16,55],[-8,8]],[[5552,3756],[0,168],[27,2],[1,205],[21,2],[43,21],[10,-24],[18,22],[9,0],[15,13]],[[5696,4165],[5,-4]],[[5701,4161],[11,-46],[5,-10],[9,-33],[32,-64],[12,-6],[0,-20],[8,-37],[21,-9],[18,-26]],[[5424,5610],[23,4],[5,15],[5,-1],[7,-13],[34,22],[12,22],[15,20],[-3,21],[8,5],[27,-4],[26,27],[20,63],[14,23],[18,10]],[[5635,5824],[3,-25],[16,-36],[0,-23],[-5,-24],[2,-18],[10,-17]],[[5661,5681],[21,-25]],[[5682,5656],[15,-23],[0,-19],[19,-30],[12,-25],[7,-34],[20,-23],[5,-18]],[[5760,5484],[-9,-6],[-18,1],[-21,6],[-10,-5],[-5,-14],[-9,-2],[-10,13],[-31,-29],[-13,6],[-4,-5],[-8,-35],[-21,12],[-20,5],[-18,22],[-23,19],[-15,-18],[-10,-30],[-3,-40]],[[5512,5384],[-18,3],[-19,10],[-16,-30],[-15,-54]],[[5444,5313],[-3,17],[-1,26],[-13,19],[-10,29],[-2,21],[-13,30],[2,17],[-3,24],[2,45],[7,10],[14,59]],[[3231,7863],[20,-8],[26,2],[-14,-24],[-10,-4],[-35,25],[-7,19],[10,18],[10,-28]],[[3283,8010],[-14,-1],[-36,18],[-26,27],[10,5],[37,-14],[28,-24],[1,-11]],[[1569,7976],[-14,-8],[-46,26],[-8,20],[-25,21],[-5,16],[-28,10],[-11,32],[2,13],[30,-13],[17,-8],[26,-6],[9,-20],[14,-28],[28,-23],[11,-32]],[[3440,8101],[-18,-50],[18,19],[19,-12],[-10,-20],[25,-16],[12,14],[28,-18],[-8,-42],[19,10],[4,-31],[8,-35],[-11,-51],[-13,-2],[-18,11],[6,47],[-8,7],[-32,-50],[-17,2],[20,27],[-27,14],[-30,-3],[-54,2],[-4,17],[17,20],[-12,16],[24,34],[28,92],[18,33],[24,20],[13,-3],[-6,-16],[-15,-36]],[[1300,8302],[13,-8],[27,5],[-8,-66],[24,-46],[-11,0],[-17,27],[-10,26],[-14,18],[-5,25],[1,19]],[[2798,8762],[-11,-31],[-12,5],[-8,18],[2,4],[10,17],[12,-1],[7,-12]],[[2725,8794],[-33,-32],[-19,1],[-6,16],[20,26],[38,0],[0,-11]],[[2634,8963],[5,-25],[15,9],[16,-15],[30,-20],[32,-18],[2,-27],[21,4],[20,-19],[-25,-18],[-43,14],[-16,26],[-27,-31],[-40,-30],[-9,34],[-38,-6],[24,29],[4,45],[9,53],[20,-5]],[[2892,9049],[-31,-3],[-7,28],[12,33],[26,8],[21,-16],[1,-25],[-4,-8],[-18,-17]],[[2343,9162],[-17,-20],[-38,17],[-22,-6],[-38,26],[24,18],[19,25],[30,-17],[17,-10],[8,-11],[17,-22]],[[3135,7782],[-18,32],[0,79],[-13,16],[-18,-9],[-10,15],[-21,-44],[-8,-45],[-10,-26],[-12,-9],[-9,-3],[-3,-14],[-51,0],[-42,0],[-12,-11],[-30,-41],[-3,-5],[-9,-22],[-26,0],[-27,0],[-12,-10],[4,-11],[2,-17],[0,-6],[-36,-29],[-29,-9],[-32,-31],[-7,0],[-10,9],[-3,9],[1,6],[6,20],[13,31],[8,34],[-5,50],[-6,53],[-29,27],[3,10],[-4,7],[-8,0],[-5,9],[-2,14],[-5,-6],[-7,2],[1,5],[-6,6],[-3,15],[-21,19],[-23,19],[-27,22],[-26,21],[-25,-16],[-9,-1],[-34,15],[-23,-7],[-27,17],[-28,10],[-19,3],[-9,10],[-5,31],[-9,0],[-1,-22],[-57,0],[-95,0],[-94,0],[-84,0],[-83,0],[-82,0],[-85,0],[-27,0],[-82,0],[-79,0]],[[1588,8004],[-4,0],[-54,57],[-20,25],[-50,23],[-15,51],[3,36],[-35,24],[-5,47],[-34,42],[0,29]],[[1374,8338],[15,28],[0,36],[-48,37],[-28,66],[-17,41],[-26,26],[-19,23],[-14,30],[-28,-18],[-27,-33],[-25,38],[-19,25],[-27,16],[-28,2],[0,328],[1,214]],[[1084,9197],[51,-14],[44,-28],[29,-5],[24,24],[34,18],[41,-7],[42,25],[45,14],[20,-23],[20,13],[6,27],[20,-6],[47,-52],[37,39],[3,-43],[34,9],[11,17],[34,-3],[42,-25],[65,-21],[38,-9],[28,3],[37,-29],[-39,-29],[50,-12],[75,7],[24,10],[29,-35],[31,30],[-29,24],[18,20],[34,2],[22,6],[23,-14],[28,-31],[31,5],[49,-26],[43,9],[40,-1],[-3,35],[25,10],[43,-19],[0,-55],[17,46],[23,-1],[12,58],[-30,35],[-32,23],[2,64],[33,42],[37,-9],[28,-26],[38,-65],[-25,-28],[52,-12],[-1,-59],[38,46],[33,-37],[-9,-43],[27,-39],[29,42],[21,49],[1,63],[40,-4],[41,-8],[37,-29],[2,-29],[-21,-30],[20,-31],[-4,-28],[-54,-40],[-39,-9],[-29,17],[-8,-29],[-27,-48],[-8,-26],[-32,-39],[-40,-3],[-22,-25],[-2,-37],[-32,-7],[-34,-47],[-30,-65],[-11,-45],[-1,-67],[40,-10],[13,-54],[13,-43],[39,11],[51,-25],[28,-22],[20,-27],[35,-16],[29,-24],[46,-3],[30,-6],[-4,-50],[8,-58],[21,-64],[41,-55],[21,19],[15,59],[-14,91],[-20,30],[45,27],[31,41],[16,40],[-3,38],[-19,49],[-33,44],[32,60],[-12,52],[-9,90],[19,13],[48,-15],[29,-6],[23,15],[25,-19],[35,-34],[8,-22],[50,-4],[-1,-49],[9,-73],[25,-9],[21,-34],[40,32],[26,64],[19,27],[21,-52],[36,-73],[31,-69],[-11,-36],[37,-33],[25,-33],[44,-15],[18,-18],[11,-49],[22,-7],[11,-22],[2,-65],[-20,-21],[-20,-21],[-46,-20],[-35,-47],[-47,-10],[-59,12],[-42,1],[-29,-4],[-23,-42],[-35,-25],[-40,-76],[-32,-53],[23,9],[45,76],[58,48],[42,5],[24,-28],[-26,-38],[9,-63],[9,-43],[36,-29],[46,9],[28,64],[2,-41],[17,-21],[-34,-38],[-61,-34],[-28,-24],[-31,-41],[-21,4],[-1,49],[48,48],[-44,-2],[-31,-7]],[[1829,9393],[-14,-27],[61,17],[39,-29],[31,30],[26,-19],[23,-57],[14,24],[-20,59],[24,9],[28,-10],[31,-23],[17,-56],[9,-41],[47,-28],[50,-27],[-3,-26],[-46,-4],[18,-22],[-9,-22],[-51,10],[-48,15],[-32,-3],[-52,-20],[-70,-9],[-50,-5],[-15,27],[-38,16],[-24,-7],[-35,46],[19,6],[43,10],[39,-3],[36,10],[-54,14],[-59,-5],[-39,1],[-15,22],[64,23],[-42,-1],[-49,15],[23,43],[20,23],[74,35],[29,-11]],[[2097,9410],[-24,-38],[-44,41],[10,8],[37,2],[21,-13]],[[2879,9392],[3,-16],[-30,2],[-30,1],[-30,-8],[-8,4],[-31,30],[1,21],[14,4],[63,-6],[48,-32]],[[2595,9395],[22,-36],[26,47],[70,23],[48,-59],[-4,-38],[55,17],[26,23],[62,-30],[38,-27],[3,-25],[52,13],[29,-37],[67,-22],[24,-24],[26,-54],[-51,-26],[66,-38],[44,-13],[40,-53],[44,-3],[-9,-41],[-49,-67],[-34,25],[-44,55],[-36,-7],[-3,-33],[29,-33],[38,-27],[11,-15],[18,-57],[-9,-42],[-35,16],[-70,46],[39,-49],[29,-35],[5,-20],[-76,23],[-59,33],[-34,28],[10,16],[-42,30],[-40,28],[0,-17],[-80,-9],[-23,20],[18,42],[52,1],[57,8],[-9,20],[10,29],[36,56],[-8,25],[-11,20],[-42,28],[-57,20],[18,14],[-29,36],[-25,3],[-22,20],[-14,-17],[-51,-8],[-101,13],[-59,17],[-45,9],[-23,20],[29,26],[-39,1],[-9,58],[21,51],[29,24],[72,15],[-21,-37]],[[2212,9435],[33,-13],[50,8],[7,-17],[-26,-28],[42,-24],[-5,-52],[-45,-22],[-27,4],[-19,22],[-69,45],[0,18],[57,-7],[-31,38],[33,28]],[[2411,9373],[-30,-43],[-32,2],[-17,51],[1,28],[14,25],[28,15],[58,-2],[53,-14],[-42,-51],[-33,-11]],[[1654,9293],[-73,-28],[-15,25],[-64,31],[12,24],[19,42],[24,38],[-27,35],[94,9],[39,-11],[71,-4],[27,-16],[30,-25],[-35,-14],[-68,-41],[-34,-40],[0,-25]],[[2399,9500],[-15,-22],[-40,4],[-34,15],[15,26],[40,15],[24,-20],[10,-18]],[[2264,9600],[21,-26],[1,-30],[-13,-43],[-46,-6],[-30,9],[1,34],[-45,-4],[-2,44],[30,-2],[41,20],[40,-3],[2,7]],[[1994,9570],[11,-20],[25,10],[29,-3],[5,-28],[-17,-28],[-94,-8],[-70,-25],[-43,-2],[-3,19],[57,26],[-125,-7],[-39,10],[38,56],[26,16],[78,-19],[50,-34],[48,-5],[-40,56],[26,21],[29,-7],[9,-28]],[[2370,9622],[30,-19],[55,1],[24,-19],[-6,-22],[32,-13],[17,-14],[38,-2],[40,-5],[44,12],[57,5],[45,-4],[30,-21],[6,-24],[-17,-16],[-42,-12],[-35,7],[-80,-9],[-57,-1],[-45,7],[-74,19],[-9,31],[-4,29],[-27,25],[-58,7],[-32,18],[10,24],[58,-4]],[[1772,9654],[-4,-45],[-21,-20],[-26,-3],[-52,-24],[-44,-9],[-38,12],[47,44],[57,37],[43,-1],[38,9]],[[2393,9646],[-13,-1],[-52,3],[-7,16],[56,0],[19,-11],[-3,-7]],[[1939,9656],[-52,-16],[-41,19],[23,18],[40,6],[39,-9],[-9,-18]],[[1954,9709],[-34,-12],[-46,0],[0,9],[29,17],[14,-3],[37,-11]],[[2338,9677],[-41,-12],[-23,14],[-12,21],[-2,24],[36,-2],[16,-4],[33,-20],[-7,-21]],[[2220,9693],[11,-24],[-45,6],[-46,19],[-62,2],[27,17],[-34,14],[-2,22],[55,-8],[75,-21],[21,-27]],[[2583,9770],[33,-19],[-38,-17],[-51,-44],[-50,-4],[-57,8],[-30,23],[0,21],[22,15],[-50,0],[-31,19],[-18,26],[20,26],[19,17],[28,4],[-12,14],[65,3],[35,-31],[47,-13],[46,-10],[22,-38]],[[3097,9968],[74,-5],[60,-7],[51,-16],[-2,-15],[-67,-25],[-68,-12],[-25,-12],[61,0],[-66,-35],[-45,-16],[-48,-47],[-57,-10],[-18,-12],[-84,-6],[39,-7],[-20,-10],[23,-29],[-26,-20],[-43,-16],[-13,-22],[-39,-18],[4,-13],[48,3],[0,-14],[-74,-35],[-73,16],[-81,-9],[-42,7],[-52,3],[-4,28],[52,13],[-14,41],[17,4],[74,-25],[-38,37],[-45,11],[23,23],[49,13],[8,20],[-39,23],[-12,30],[76,-3],[22,-6],[43,21],[-62,7],[-98,-4],[-49,19],[-23,24],[-32,17],[-6,19],[41,11],[32,2],[55,9],[41,22],[34,-3],[30,-16],[21,31],[37,9],[50,6],[85,3],[14,-6],[81,9],[60,-3],[60,-4]],[[5290,7883],[-3,-24],[-12,-10],[-20,8],[-6,-24],[-14,-1],[-5,9],[-15,-20],[-13,-3],[-12,13]],[[5190,7831],[-10,25],[-13,-9],[0,26],[21,32],[-1,15],[12,-5],[8,10]],[[5207,7925],[24,-1],[5,13],[30,-18]],[[3140,2021],[-10,-23],[-23,-18],[-14,2],[-16,5],[-21,17],[-29,8],[-35,32],[-28,31],[-38,65],[23,-12],[39,-39],[36,-20],[15,26],[9,40],[25,23],[20,-6]],[[3095,2171],[-25,0],[-13,-14],[-25,-21],[-5,-53],[-11,-2],[-32,19],[-32,40],[-34,33],[-9,36],[8,34],[-14,39],[-4,98],[12,55],[30,45],[-43,16],[27,51],[9,96],[31,-20],[15,119],[-19,15],[-9,-72],[-17,8],[9,83],[9,106],[13,40],[-8,56],[-2,65],[11,2],[17,93],[20,92],[11,86],[-6,86],[8,47],[-3,72],[16,70],[5,111],[9,120],[9,129],[-2,94],[-6,81]],[[3045,4126],[14,15],[8,29]],[[8064,6258],[-24,-28],[-23,18],[0,50],[13,26],[31,16],[16,-1],[6,-22],[-12,-26],[-7,-33]],[[8628,7624],[-18,34],[-11,-33],[-43,-24],[4,-31],[-24,2],[-13,18],[-19,-40],[-30,-31],[-23,-37]],[[8451,7482],[-39,-17],[-20,-27],[-30,-16],[15,27],[-6,22],[22,39],[-15,30],[-24,-20],[-32,-40],[-17,-37],[-27,-3],[-14,-27],[15,-39],[22,-9],[1,-26],[22,-17],[31,41],[25,-22],[18,-2],[4,-30],[-39,-16],[-13,-31],[-27,-29],[-14,-40],[30,-32],[11,-57],[17,-52],[18,-45],[0,-42],[-17,-16],[6,-31],[17,-18],[-5,-47],[-7,-45],[-15,-5],[-21,-63],[-22,-75],[-26,-69],[-38,-53],[-39,-49],[-31,-6],[-17,-26],[-10,19],[-15,-29],[-39,-29],[-29,-8],[-10,-61],[-15,-4],[-8,42],[7,22],[-37,19],[-13,-9]],[[8001,6424],[-28,14],[-14,24],[5,33],[-26,11],[-13,21],[-24,-31],[-27,-6],[-22,0],[-15,-14]],[[7837,6476],[-14,-8],[4,-66],[-15,1],[-2,14]],[[7810,6417],[-1,24],[-20,-17],[-12,10],[-21,22],[8,48],[-18,11],[-6,53],[-30,-9],[4,68],[26,48],[1,47],[-1,45],[-12,13],[-9,34],[-16,-4]],[[7703,6810],[-30,8],[9,25],[-13,35],[-20,-24],[-23,14],[-32,-36],[-25,-43],[-23,-7]],[[7466,6754],[-2,46],[-17,-12]],[[7447,6788],[-32,5],[-32,14],[-22,25],[-22,11],[-9,28],[-16,8],[-28,38],[-22,17],[-12,-13]],[[7252,6921],[-38,40],[-28,36],[-7,64],[20,-8],[1,29],[-12,30],[3,47],[-30,67]],[[7161,7226],[-45,24],[-8,44],[-21,27]],[[7082,7337],[-4,33],[1,22],[-17,14],[-9,-6],[-7,53]],[[7046,7453],[8,13],[-4,14],[26,27],[20,11],[29,-8],[11,37],[35,7],[10,23],[44,31],[4,13]],[[7229,7621],[-2,33],[19,15],[-25,100],[55,23],[14,13],[20,103],[55,-19],[15,26],[2,58],[23,5],[21,38]],[[7426,8016],[11,5]],[[7437,8021],[7,-40],[23,-31],[40,-21],[19,-47],[-10,-67],[10,-25],[33,-10],[37,-8],[33,-36],[18,-6],[12,-53],[17,-34],[30,1],[58,-13],[36,8],[28,-8],[41,-35],[34,0],[12,-18],[32,31],[45,20],[42,2],[32,20],[20,31],[20,19],[-5,19],[-9,22],[15,38],[15,-6],[29,-11],[28,30],[42,23],[20,38],[20,16],[40,8],[22,-7],[3,21],[-25,40],[-22,18],[-22,-21],[-27,9],[-16,-7],[-7,23],[20,58],[13,43]],[[8240,8055],[34,-22],[39,37],[-1,25],[26,61],[15,19],[0,32],[-16,13],[23,29],[35,10],[37,2],[41,-17],[25,-22],[17,-58],[10,-24],[10,-36],[10,-56],[49,-19],[32,-41],[12,-54],[42,0],[24,23],[46,17],[-15,-52],[-11,-21],[-9,-63],[-19,-56],[-33,10],[-24,-20],[7,-49],[-4,-68],[-14,-2],[0,-29]],[[4920,5470],[-12,-1],[-20,12],[-18,-1],[-33,-10],[-19,-17],[-27,-21],[-6,2]],[[4785,5434],[2,47],[3,7],[-1,23],[-12,24],[-8,4],[-8,16],[6,25],[-3,28],[1,17]],[[4765,5625],[5,0],[1,25],[-2,11],[3,8],[10,7],[-7,46],[-6,24],[2,20],[5,4]],[[4776,5770],[4,5],[8,-8],[21,-1],[5,17],[5,-1],[8,6],[4,-24],[7,7],[11,9]],[[4921,5738],[7,-82],[-11,-49],[-8,-65],[12,-49],[-1,-23]],[[5363,5313],[-4,3],[-16,-7],[-17,7],[-13,-3]],[[5313,5313],[-45,1]],[[5268,5314],[4,45],[-11,39],[-13,9],[-6,26],[-7,8],[1,16]],[[5236,5457],[7,41],[13,56],[8,0],[17,34],[10,1],[16,-24],[19,19],[2,24],[7,24],[4,29],[15,23],[5,41],[6,13],[4,30],[7,36],[24,45],[1,19],[3,10],[-11,23]],[[5393,5901],[1,19],[8,3]],[[5402,5923],[11,-37],[2,-38],[-1,-38],[15,-53],[-15,1],[-8,-4],[-13,6],[-6,-28],[16,-33],[13,-10],[3,-24],[9,-40],[-4,-15]],[[5444,5313],[-2,-31],[-22,14],[-22,15],[-35,2]],[[5856,5385],[-2,-68],[11,-8],[-9,-20],[-10,-15],[-11,-30],[-6,-27],[-1,-46],[-7,-22],[0,-44]],[[5821,5105],[-8,-16],[-1,-34],[-4,-5],[-2,-31]],[[5814,4923],[5,-53],[-2,-30],[5,-33],[16,-32],[15,-73]],[[5853,4702],[-11,6],[-37,-10],[-7,-7],[-8,-36],[6,-26],[-5,-68],[-3,-58],[7,-10],[19,-22],[8,10],[2,-62],[-21,1],[-11,31],[-10,25],[-22,8],[-6,30],[-17,-18],[-22,8],[-10,26],[-17,5],[-13,-1],[-2,18],[-9,1]],[[5342,4831],[-4,18]],[[5360,4907],[8,-6],[9,22],[15,0],[2,-17],[11,-10],[16,36],[16,28],[7,19],[-1,47],[12,56],[13,30],[18,28],[3,18],[1,21],[5,20],[-2,33],[4,51],[5,36],[8,30],[2,35]],[[5760,5484],[17,-48],[12,-7],[8,10],[12,-4],[16,12],[6,-24],[25,-38]],[[5330,4892],[-22,61]],[[5308,4953],[21,32],[-11,38],[10,15],[19,7],[2,25],[15,-27],[24,-3],[9,27],[3,39],[-3,45],[-13,34],[12,66],[-7,12],[-21,-5],[-7,30],[2,25]],[[2906,5174],[-12,13],[-14,19],[-7,-9],[-24,8],[-7,25],[-5,-1],[-28,33]],[[2809,5262],[-3,18],[10,4],[-1,29],[6,21],[14,4],[12,36],[10,30],[-10,14],[5,33],[-6,53],[6,15],[-4,49],[-12,30]],[[2836,5598],[4,28],[9,-4],[5,17],[-6,34],[3,9]],[[2851,5682],[14,-2],[21,40],[12,6],[0,19],[5,49],[16,27],[17,1],[3,12],[21,-5],[22,29],[11,13],[14,28],[9,-4],[8,-15],[-6,-19]],[[3018,5861],[-18,-10],[-7,-29],[-10,-16],[-8,-22],[-4,-41],[-8,-34],[15,-3],[3,-27],[6,-13],[3,-23],[-4,-21],[1,-12],[7,-5],[7,-20],[36,6],[16,-8],[19,-49],[11,6],[20,-3],[16,6],[10,-10],[-5,-31],[-6,-19],[-2,-41],[5,-38],[8,-18],[1,-12],[-14,-29],[10,-13],[8,-20],[8,-57]],[[3058,4935],[-14,31],[-8,1],[18,59],[-21,27],[-17,-5],[-10,10],[-15,-16],[-21,8],[-16,60],[-13,15],[-9,27],[-19,27],[-7,-5]],[[2695,5656],[-15,13],[-6,12],[4,10],[-1,13],[-8,13],[-11,12],[-10,7],[-1,17],[-8,10],[2,-16],[-5,-14],[-7,16],[-9,5],[-4,12],[1,18],[3,18],[-8,8],[7,11]],[[2619,5821],[4,7],[18,-15],[7,8],[9,-5],[4,-12],[8,-4],[7,12]],[[2676,5812],[7,-31],[11,-23],[13,-25]],[[2707,5733],[-11,-5],[0,-23],[6,-9],[-4,-6],[1,-11],[-2,-11],[-2,-12]],[[2715,6518],[23,-4],[22,-1],[26,-20],[11,-21],[26,7],[10,-14],[24,-35],[17,-26],[9,0],[17,-11],[-2,-17],[20,-2],[21,-23],[-3,-14],[-19,-7],[-18,-3],[-19,4],[-40,-5],[18,32],[-11,15],[-18,4],[-9,16],[-7,33],[-16,-2],[-26,15],[-8,12],[-36,9],[-10,12],[11,14],[-28,3],[-20,-30],[-11,-1],[-4,-14],[-14,-6],[-12,5],[15,18],[6,21],[13,13],[14,11],[21,5],[7,7]],[[5909,7206],[2,0],[4,14],[20,-1],[25,18],[-19,-25],[2,-11]],[[5943,7201],[-3,2],[-5,-4],[-4,1],[-2,-2],[0,6],[-2,3],[-6,1],[-7,-5],[-5,3]],[[5943,7201],[1,-4],[-28,-24],[-14,8],[-7,23],[14,2]],[[5377,7997],[-16,25],[-14,14],[-3,24],[-5,17],[21,12],[10,15],[20,11],[7,11],[7,-7],[13,6]],[[5417,8125],[13,-18],[21,-5],[-2,-16],[15,-12],[4,15],[19,-7],[3,-18],[20,-3],[13,-28]],[[5523,8033],[-8,0],[-4,-11],[-7,-2],[-2,-13],[-5,-3],[-1,-6],[-9,-5],[-12,0],[-4,-12]],[[5275,8349],[1,-23],[28,-13],[-1,-21],[29,11],[15,16],[32,-23],[13,-18]],[[5392,8278],[6,-29],[-8,-16],[11,-20],[6,-31],[-2,-20],[12,-37]],[[5207,7925],[3,41],[14,39],[-40,11],[-13,15]],[[5171,8031],[2,25],[-6,13]],[[5171,8108],[-5,60],[17,0],[7,22],[6,53],[-5,19]],[[5191,8262],[6,12],[23,3],[5,-12],[19,28],[-6,22],[-2,32]],[[5236,8347],[21,-7],[18,9]],[[6196,5914],[7,-18],[-1,-24],[-16,-14],[12,-16]],[[6198,5842],[-10,-30]],[[6188,5812],[-7,10],[-6,-4],[-16,1],[0,17],[-2,16],[9,27],[10,26]],[[6176,5905],[12,-5],[8,14]],[[5352,8385],[-17,-47],[-29,33],[-4,23],[41,20],[9,-29]],[[5236,8347],[-11,32],[-1,59],[5,16],[8,17],[24,4],[10,15],[22,17],[-1,-30],[-8,-19],[4,-16],[15,-8],[-7,-22],[-8,6],[-20,-41],[7,-28]],[[3008,6318],[3,9],[22,0],[16,-15],[8,2],[5,-21],[15,2],[-1,-18],[12,-2],[14,-21],[-10,-23],[-14,12],[-12,-2],[-9,3],[-5,-11],[-11,-3],[-4,14],[-10,-9],[-11,-39],[-7,9],[-1,17]],[[3008,6222],[0,15],[-7,17],[7,10],[2,22],[-2,32]],[[5333,6534],[-95,-110],[-81,-113],[-39,-26]],[[5118,6285],[-31,-5],[0,36],[-13,10],[-17,16],[-7,27],[-94,126],[-93,126]],[[4863,6621],[-105,139]],[[4758,6760],[1,11],[0,4]],[[4759,6775],[0,68],[44,43],[28,9],[23,15],[11,29],[32,23],[1,42],[16,5],[13,22],[36,9],[5,23],[-7,12],[-10,61],[-1,35],[-11,37]],[[4939,7208],[27,31],[30,10],[17,24],[27,17],[47,11],[46,4],[14,-8],[26,22],[30,1],[11,-14],[19,4]],[[5233,7310],[-5,-30],[4,-54],[-6,-48],[-18,-32],[3,-43],[23,-35],[0,-14],[17,-23],[12,-103]],[[5263,6928],[9,-51],[1,-27],[-5,-47],[2,-26],[-3,-32],[2,-36],[-11,-24],[17,-42],[1,-25],[10,-32],[13,11],[22,-27],[12,-36]],[[2769,4986],[15,43],[-6,26],[-11,-27],[-16,25],[5,16],[-4,53],[9,8],[5,36],[11,37],[-2,24],[15,12],[19,23]],[[2906,5174],[4,-44],[-9,-37],[-30,-61],[-33,-22],[-17,-51],[-6,-38],[-15,-24],[-12,29],[-11,6],[-12,-4],[-1,21],[8,13],[-3,24]],[[5969,6881],[-7,-23],[-6,-43],[-8,-30],[-6,-10],[-10,18],[-12,26],[-20,82],[-3,-5],[12,-61],[17,-57],[21,-90],[10,-31],[9,-33],[25,-64],[-6,-10],[1,-37],[33,-52],[4,-12]],[[6023,6449],[-110,0],[-107,0],[-112,0]],[[5694,6449],[0,212],[0,205],[-8,46],[7,36],[-5,25],[10,27]],[[5698,7000],[37,1],[27,-15],[28,-17],[13,-9],[21,18],[11,17],[25,5],[20,-8],[7,-28],[7,19],[22,-14],[22,-3],[13,14]],[[5951,6980],[18,-99]],[[6176,5905],[-10,18],[-11,34],[-12,19],[-8,19],[-24,24],[-19,0],[-7,12],[-16,-13],[-17,26],[-8,-43],[-33,12]],[[6011,6013],[-3,23],[12,85],[3,38],[9,18],[20,9],[14,33]],[[6066,6219],[16,-67],[8,-53],[15,-28],[38,-54],[16,-33],[15,-33],[8,-20],[14,-17]],[[4749,7594],[1,41],[-11,25],[39,42],[34,-11],[37,1],[30,-10],[23,3],[45,-2]],[[4947,7683],[11,-23],[51,-26],[10,13],[31,-26],[32,7]],[[5082,7628],[2,-33],[-26,-39],[-36,-12],[-2,-19],[-18,-32],[-10,-47],[11,-33],[-16,-26],[-6,-37],[-21,-11],[-20,-45],[-35,-1],[-27,1],[-17,-20],[-11,-22],[-13,5],[-11,20],[-8,33],[-26,9]],[[4792,7319],[-2,19],[10,21],[4,16],[-9,17],[7,38],[-11,34],[12,5],[1,27],[5,9],[0,45],[13,15],[-8,29],[-16,2],[-5,-7],[-16,0],[-7,28],[-11,-8],[-10,-15]],[[5675,8510],[3,34],[-10,-7],[-18,21],[-2,33],[35,16],[35,8],[30,-9],[29,1]],[[5777,8607],[4,-10],[-20,-33],[8,-54],[-12,-18]],[[5757,8492],[-22,0],[-24,21],[-13,8],[-23,-11]],[[6188,5812],[-6,-21],[10,-31],[10,-28],[11,-21],[90,-68],[24,0]],[[6327,5643],[-79,-173],[-36,-2],[-25,-41],[-17,-1],[-8,-18]],[[6162,5408],[-19,0],[-11,20],[-26,-24],[-8,-24],[-18,4],[-6,7],[-7,-2],[-9,1],[-35,49],[-19,0],[-10,19],[0,32],[-14,10]],[[5980,5500],[-17,62],[-12,14],[-5,23],[-14,28],[-17,4],[9,33],[15,1],[4,18]],[[5943,5683],[0,51]],[[5943,5734],[8,61],[13,16],[3,23],[12,44],[17,29],[11,56],[4,50]],[[5794,9159],[-4,-40],[42,-38],[-26,-44],[33,-65],[-19,-50],[25,-42],[-11,-38],[41,-39],[-11,-30],[-25,-33],[-60,-74]],[[5779,8666],[-50,-4],[-49,-21],[-45,-12],[-16,31],[-27,19],[6,57],[-14,52],[14,33],[25,36],[63,63],[19,12],[-3,24],[-39,27]],[[5663,8983],[-9,23],[-1,88],[-43,40],[-37,28]],[[5573,9162],[17,15],[30,-30],[37,2],[30,-13],[26,25],[14,42],[43,20],[35,-23],[-11,-41]],[[9954,4184],[9,-17],[-4,-30],[-17,-8],[-16,8],[-2,25],[10,20],[13,-8],[7,10]],[[0,4229],[9981,-14],[-17,-12],[-4,21],[14,12],[9,3],[-9983,18]],[[0,4257],[0,-28]],[[0,4257],[6,3],[-4,-28],[-2,-3]],[[3300,2197],[33,34],[24,-14],[16,23],[22,-26],[-8,-20],[-37,-17],[-13,20],[-23,-26],[-14,26]],[[3485,5316],[7,24],[3,26],[4,25],[-10,34],[-3,39],[15,50]],[[3501,5514],[9,-6],[21,-14],[29,-49],[5,-23]],[[5265,7610],[-9,-45],[-13,12],[-6,39],[5,21],[18,22],[5,-49]],[[5157,8035],[6,-5],[8,1]],[[5190,7831],[-2,-16],[9,-22],[-10,-18],[7,-44],[15,-8],[-3,-25]],[[5206,7698],[-25,-32],[-55,16],[-40,-19],[-4,-35]],[[4947,7683],[14,34],[5,115],[-28,61],[-21,29],[-42,22],[-3,42],[36,12],[47,-14],[-9,65],[26,-25],[65,45],[8,47],[24,12]],[[5308,4953],[-29,58],[-18,48],[-17,59],[1,20],[6,18],[7,42],[5,43]],[[5263,5241],[10,3],[40,-1],[0,70]],[[4827,8284],[-21,12],[-17,-1],[6,31],[-6,31]],[[4789,8357],[23,2],[30,-35],[-15,-40]],[[4916,8559],[-30,-62],[29,7],[30,0],[-7,-47],[-25,-51],[29,-4],[2,-6],[25,-68],[19,-9],[17,-66],[8,-23],[33,-11],[-3,-36],[-14,-17],[11,-30],[-25,-30],[-37,0],[-48,-16],[-13,12],[-18,-27],[-26,6],[-19,-22],[-15,12],[41,60],[25,13],[-1,0],[-43,9],[-8,23],[29,18],[-15,31],[5,38],[42,-5],[4,33],[-19,36],[-34,10],[-7,16],[10,26],[-9,16],[-15,-28],[-1,56],[-14,29],[10,60],[21,47],[23,-5],[33,5]],[[6154,7574],[4,25],[-7,39],[-16,21],[-16,7],[-10,18]],[[6109,7684],[4,6],[23,-9],[41,-10],[38,-27],[5,-11],[17,9],[25,-12],[9,-24],[17,-13]],[[6210,7549],[-27,28],[-29,-3]],[[5029,5524],[-44,-34],[-15,-20],[-25,-16],[-25,16]],[[5000,5817],[-2,-18],[12,-30],[0,-42],[2,-45],[7,-21],[-6,-52],[2,-28],[8,-37],[6,-20]],[[4765,5625],[-8,2],[-5,-24],[-8,1],[-6,12],[2,23],[-11,35],[-8,-6],[-6,-1]],[[4715,5667],[-7,-4],[0,21],[-4,15],[0,17],[-6,24],[-7,21],[-23,0],[-6,-11],[-8,-1],[-4,-13],[-4,-16],[-14,-25]],[[4632,5695],[-13,34],[-10,23],[-8,7],[-6,12],[-4,25],[-4,13],[-8,9]],[[4579,5818],[13,28],[8,-1],[7,10],[6,0],[5,8],[-3,19],[3,6],[1,19]],[[4619,5907],[13,0],[20,-14],[6,1],[3,6],[15,-4],[4,3]],[[4680,5899],[1,-21],[5,0],[7,8],[5,-2],[7,-15],[12,-5],[8,13],[9,8],[6,8],[6,-2],[6,-12],[3,-16],[12,-24],[-6,-15],[-1,-19],[6,6],[3,-7],[-1,-17],[8,-17]],[[4532,5940],[3,25]],[[4535,5965],[31,2],[6,14],[9,1],[11,-15],[8,0],[9,10],[6,-17],[-12,-13],[-12,1],[-12,12],[-10,-13],[-5,0],[-7,-8],[-25,1]],[[4579,5818],[-15,24],[-11,4],[-7,16],[1,9],[-9,12],[-2,13]],[[4536,5896],[15,9],[9,-2],[8,7],[51,-3]],[[5263,5241],[-5,8],[10,65]],[[5658,7238],[15,-19],[22,3],[20,-4],[0,-10],[15,7],[-4,-17],[-40,-5],[1,10],[-34,11],[5,24]],[[5723,7533],[-17,2],[-14,5],[-34,-15],[19,-32],[-14,-9],[-15,0],[-15,29],[-5,-12],[6,-35],[14,-27],[-10,-12],[15,-27],[14,-17],[0,-32],[-25,15],[8,-29],[-18,-6],[11,-51],[-19,-1],[-23,25],[-10,46],[-5,38],[-11,27],[-14,33],[-2,16]],[[5583,7534],[18,5],[11,13],[15,-1],[5,10],[5,2]],[[5725,7591],[13,-15],[-8,-36],[-7,-7]],[[3701,9940],[93,35],[97,-3],[36,21],[98,6],[222,-7],[174,-46],[-52,-22],[-106,-3],[-150,-5],[14,-10],[99,6],[83,-20],[54,18],[23,-21],[-30,-34],[71,22],[135,22],[83,-11],[15,-25],[-113,-40],[-16,-14],[-88,-10],[64,-2],[-32,-42],[-23,-38],[1,-64],[33,-37],[-43,-3],[-46,-18],[52,-31],[6,-49],[-30,-5],[36,-49],[-61,-5],[32,-23],[-9,-20],[-39,-9],[-39,0],[35,-39],[0,-26],[-55,24],[-14,-16],[37,-14],[37,-35],[10,-47],[-49,-11],[-22,23],[-34,33],[10,-39],[-33,-31],[73,-2],[39,-3],[-75,-50],[-75,-46],[-81,-20],[-31,0],[-29,-22],[-38,-61],[-60,-40],[-19,-3],[-37,-14],[-40,-13],[-24,-36],[0,-40],[-15,-38],[-45,-46],[11,-45],[-12,-48],[-14,-56],[-39,-3],[-41,47],[-56,0],[-27,31],[-18,57],[-49,71],[-14,38],[-3,52],[-39,53],[10,42],[-18,20],[27,68],[42,21],[11,24],[6,45],[-32,-20],[-15,-9],[-25,-8],[-34,19],[-2,39],[11,31],[25,0],[57,-15],[-48,37],[-24,19],[-28,-8],[-23,15],[31,53],[-17,22],[-22,39],[-34,62],[-35,22],[0,24],[-74,34],[-59,4],[-74,-2],[-68,-5],[-32,19],[-49,36],[73,18],[56,3],[-119,15],[-62,23],[3,23],[106,28],[101,27],[11,21],[-75,21],[24,23],[97,40],[40,6],[-12,26],[66,15],[86,9],[85,1],[30,-18],[74,32],[66,-22],[39,-5],[58,-18],[-66,31],[4,24]],[[2497,5973],[-14,10],[-17,1],[-13,12],[-15,24]],[[2438,6020],[1,16],[3,14],[-4,11],[13,47],[36,0],[1,19],[-5,4],[-3,12],[-10,14],[-11,19],[13,0],[0,32],[26,1],[26,-1]],[[2529,6097],[10,-10],[2,8],[8,-7]],[[2549,6088],[-13,-22],[-13,-16],[-2,-11],[2,-11],[-5,-15]],[[2518,6013],[-7,-3],[2,-7],[-6,-7],[-9,-14],[-1,-9]],[[3340,5664],[18,-21],[17,-37],[1,-30],[10,-1],[15,-29],[11,-20]],[[3412,5526],[-4,-51],[-17,-15],[1,-14],[-5,-30],[13,-42],[9,0],[3,-32],[17,-50]],[[3313,5482],[-19,44],[7,15],[0,27],[17,9],[7,11],[-10,21],[3,21],[22,34]],[[2574,5930],[-5,18],[-8,5]],[[2561,5953],[2,23],[-4,6],[-6,5],[-12,-7],[-1,7],[-8,10],[-6,11],[-8,5]],[[2549,6088],[3,-2],[6,10],[8,1],[3,-5],[4,3],[13,-5],[13,1],[9,7],[3,6],[9,-3],[6,-4],[8,2],[5,5],[13,-8],[4,-2],[9,-10],[8,-13],[10,-9],[7,-16]],[[2690,6046],[-9,1],[-4,-8],[-10,-7],[-7,0],[-6,-8],[-6,3],[-4,9],[-3,-2],[-4,-14],[-3,1],[0,-12],[-10,-16],[-5,-7],[-3,-7],[-8,12],[-6,-16],[-6,1],[-6,-1],[0,-29],[-4,0],[-3,-13],[-9,-3]],[[5522,7826],[7,-22],[9,-17],[-11,-21]],[[5515,7638],[-3,-9]],[[5512,7629],[-26,21],[-16,21],[-26,17],[-23,42],[6,4],[-13,25],[-1,19],[-17,9],[-9,-25],[-8,20],[0,20],[1,1]],[[5380,7803],[20,-2],[5,9],[9,-9],[11,-1],[0,16],[10,6],[2,23],[23,15]],[[5460,7860],[8,-7],[21,-24],[23,-12],[10,9]],[[3008,6222],[-19,9],[-13,-4],[-17,5],[-13,-11],[-15,18],[3,18],[25,-8],[21,-4],[10,12],[-12,25],[0,22],[-18,9],[7,16],[17,-2],[24,-9]],[[5471,7954],[14,-15],[10,-6],[24,7],[2,11],[11,2],[14,9],[3,-4],[13,7],[6,14],[9,3],[30,-17],[6,6]],[[5613,7971],[15,-16],[2,-15]],[[5630,7940],[-17,-12],[-13,-39],[-17,-40],[-22,-10]],[[5561,7839],[-17,2],[-22,-15]],[[5460,7860],[-6,20],[-4,0]],[[8352,4593],[-11,-1],[-37,40],[26,11],[14,-17],[10,-18],[-2,-15]],[[8471,4670],[2,-11],[1,-17]],[[8474,4642],[-18,-43],[-24,-13],[-3,7],[2,19],[12,36],[28,22]],[[8274,4716],[10,-15],[17,5],[7,-25],[-32,-11],[-19,-8],[-15,0],[10,33],[15,1],[7,20]],[[8413,4716],[-4,-32],[-42,-16],[-37,7],[0,21],[22,12],[18,-17],[18,4],[25,21]],[[8017,4792],[53,-6],[6,24],[51,-28],[10,-37],[42,-10],[34,-35],[-31,-21],[-31,23],[-25,-2],[-29,4],[-26,11],[-32,22],[-21,5],[-11,-7],[-51,24],[-5,25],[-25,4],[19,55],[34,-3],[22,-23],[12,-4],[4,-21]],[[8741,4825],[-14,-40],[-3,44],[5,20],[6,20],[7,-17],[-1,-27]],[[8534,4983],[-11,-19],[-19,11],[-5,25],[28,2],[7,-19]],[[8623,5004],[10,-44],[-23,24],[-23,5],[-16,-4],[-19,2],[6,32],[35,2],[30,-17]],[[8916,5033],[0,-188],[1,-188]],[[8917,4657],[-25,48],[-28,11],[-7,-16],[-35,-2],[12,47],[17,16],[-7,63],[-14,48],[-53,49],[-23,4],[-42,54],[-8,-28],[-11,-5],[-6,21],[0,25],[-21,28],[29,21],[20,-1],[-2,15],[-41,0],[-11,34],[-25,11],[-11,28],[37,14],[14,19],[45,-23],[4,-22],[8,-93],[29,-34],[23,61],[32,34],[25,0],[23,-20],[21,-20],[30,-11]],[[8478,5264],[-22,-57],[-21,-11],[-27,11],[-46,-3],[-24,-8],[-4,-43],[24,-52],[15,26],[52,20],[-2,-27],[-12,9],[-12,-34],[-25,-22],[27,-74],[-5,-20],[25,-66],[-1,-38],[-14,-17],[-11,20],[13,47],[-27,-22],[-7,16],[3,22],[-20,34],[3,56],[-19,-17],[2,-67],[1,-83],[-17,-8],[-12,17],[8,53],[-4,55],[-12,1],[-9,39],[12,38],[4,46],[14,86],[5,24],[24,43],[22,-17],[35,-8],[32,2],[27,42],[5,-13]],[[8574,5248],[-2,-51],[-14,6],[-4,-35],[11,-30],[-8,-7],[-11,36],[-8,74],[6,46],[9,21],[2,-32],[16,-5],[3,-23]],[[8045,5298],[5,-38],[19,-33],[18,12],[18,-4],[16,29],[13,5],[26,-16],[23,12],[14,80],[11,20],[10,65],[32,0],[24,-9]],[[8274,5421],[-16,-52],[20,-55],[-5,-26],[32,-54],[-33,-6],[-10,-40],[2,-52],[-27,-39],[-1,-58],[-10,-88],[-5,21],[-31,-26],[-11,35],[-20,3],[-14,19],[-33,-21],[-10,28],[-18,-3],[-23,7],[-4,77],[-14,16],[-13,49],[-4,50],[3,54],[16,38]],[[7939,4845],[-31,-1],[-24,48],[-35,47],[-12,35],[-21,47],[-14,43],[-21,81],[-24,48],[-9,50],[-10,44],[-25,37],[-14,49],[-21,32],[-29,64],[-3,29],[18,-2],[43,-11],[25,-57],[21,-39],[16,-24],[26,-62],[28,-1],[23,-39],[16,-48],[22,-27],[-12,-47],[16,-20],[10,-1],[5,-40],[10,-32],[20,-5],[14,-37],[-7,-71],[-1,-90]],[[7252,6921],[-17,-27],[-11,-53],[27,-22],[26,-29],[36,-32],[38,-7],[16,-30],[22,-5],[33,-13],[23,0],[4,23],[-4,37],[2,25]],[[7703,6810],[2,-22],[-10,-11],[2,-35],[-19,10],[-36,-39],[0,-33],[-15,-49],[-1,-28],[-13,-47],[-21,13],[-1,-60],[-7,-19],[3,-25],[-14,-13]],[[7472,6452],[-4,-21],[-19,1],[-34,-12],[2,-43],[-15,-34],[-40,-39],[-31,-68],[-21,-36],[-28,-38],[0,-26],[-13,-14],[-26,-21],[-12,-3],[-9,-44],[6,-75],[1,-48],[-11,-54],[0,-98],[-15,-3],[-12,-44],[8,-19],[-25,-16],[-10,-39],[-11,-17],[-26,54],[-13,81],[-11,58],[-9,27],[-15,55],[-7,72],[-5,36],[-25,79],[-12,112],[-8,74],[0,69],[-5,54],[-41,-34],[-19,7],[-36,69],[13,21],[-8,23],[-33,49]],[[6893,6547],[19,38],[61,0],[-6,49],[-15,30],[-4,44],[-18,26],[31,60],[32,-4],[29,60],[18,59],[27,57],[-1,41],[24,34],[-23,28],[-9,39],[-10,51],[14,24],[42,-14],[31,9],[26,48]],[[4827,8284],[5,-41],[-21,-51],[-49,-34],[-40,8],[23,61],[-15,58],[38,45],[21,27]],[[6497,7324],[25,12],[19,33],[19,-2],[12,11],[20,-6],[31,-29],[22,-6],[31,-51],[21,-2],[3,-49]],[[6690,6900],[14,-30],[11,-35],[27,-25],[1,-51],[13,-9],[2,-27],[-40,-30],[-10,-66]],[[6708,6627],[-53,17],[-30,13],[-31,8],[-12,70],[-13,10],[-22,-10],[-28,-28],[-34,19],[-28,45],[-27,16],[-18,55],[-21,76],[-15,-9],[-17,19],[-11,-22]],[[6348,6906],[-15,30],[0,31],[-9,0],[5,41],[-15,44],[-34,32],[-19,54],[6,45],[14,20],[-2,34],[-18,17],[-18,69]],[[6243,7323],[-15,46],[5,18],[-8,66],[19,16]],[[6357,7389],[9,-42],[26,-12],[20,-29],[39,-10],[44,15],[2,13]],[[6348,6906],[-16,3]],[[6332,6909],[-19,4],[-20,-55]],[[6293,6858],[-52,5],[-78,115],[-41,41],[-34,15]],[[6088,7034],[-11,71]],[[6077,7105],[61,59],[11,70],[-3,42],[16,14],[14,36]],[[6176,7326],[12,9],[32,-7],[10,-15],[13,10]],[[4597,9009],[-7,-37],[31,-39],[-36,-44],[-80,-40],[-24,-10],[-36,8],[-78,18],[28,26],[-61,28],[49,11],[-1,17],[-58,14],[19,37],[42,9],[43,-39],[42,31],[35,-16],[45,30],[47,-4]],[[5992,7066],[-5,-18]],[[5987,7048],[-10,8],[-6,-39],[7,-6],[-7,-8],[-1,-15],[13,8]],[[5983,6996],[0,-23],[-14,-92]],[[5951,6980],[8,19],[-2,3],[8,27],[5,44],[4,14],[1,1]],[[5975,7088],[9,0],[3,10],[7,1]],[[5994,7099],[1,-24],[-4,-9],[1,0]],[[5431,7384],[-10,-45],[4,-18],[-6,-30],[-21,22],[-14,6],[-39,29],[4,30],[32,-5],[28,6],[22,5]],[[5255,7555],[17,-40],[-4,-77],[-13,4],[-11,-19],[-10,15],[-2,70],[-6,32],[15,-2],[14,17]],[[5383,7861],[-3,-29],[7,-24]],[[5387,7808],[-22,8],[-23,-20],[1,-29],[-3,-16],[9,-30],[26,-29],[14,-47],[31,-47],[22,1],[7,-13],[-8,-11],[25,-21],[20,-18],[24,-30],[3,-10],[-5,-21],[-16,27],[-24,9],[-12,-37],[20,-21],[-3,-30],[-11,-4],[-15,-49],[-12,-5],[0,18],[6,31],[6,12],[-11,34],[-8,29],[-12,7],[-8,25],[-18,10],[-12,23],[-21,4],[-21,26],[-26,37],[-19,34],[-8,57],[-14,6],[-23,19],[-12,-8],[-16,-26],[-12,-5]],[[2845,6247],[19,-5],[14,-14],[5,-16],[-19,-1],[-9,-9],[-15,9],[-16,21],[3,13],[12,4],[6,-2]],[[5992,7066],[31,-23],[54,62]],[[6088,7034],[-5,-8],[-56,-29],[28,-58],[-9,-10],[-5,-19],[-21,-8],[-7,-21],[-12,-17],[-31,9]],[[5970,6873],[-1,8]],[[5983,6996],[4,17],[0,35]],[[8739,7149],[4,-20],[-16,-35],[-11,19],[-15,-14],[-7,-33],[-18,16],[0,27],[15,35],[16,-7],[12,24],[20,-12]],[[8915,7321],[-10,-46],[4,-29],[-14,-40],[-35,-27],[-49,-4],[-40,-66],[-19,23],[-1,43],[-48,-13],[-33,-27],[-32,-1],[28,-43],[-19,-98],[-18,-24],[-13,23],[7,52],[-18,16],[-11,40],[26,17],[15,37],[28,29],[20,40],[55,17],[30,-12],[29,103],[19,-28],[40,58],[16,22],[18,70],[-5,65],[11,37],[30,10],[15,-80],[-1,-46],[-25,-58],[0,-60]],[[8997,7726],[19,-12],[20,24],[6,-64],[-41,-16],[-25,-57],[-43,39],[-15,-63],[-31,-1],[-4,57],[14,45],[29,3],[8,80],[9,44],[32,-59],[22,-20]],[[6970,7616],[-15,-10],[-37,-41],[-12,-41],[-11,0],[-7,27],[-36,2],[-5,47],[-14,1],[2,57],[-33,42],[-48,-4],[-32,-8],[-27,51],[-22,22],[-43,41],[-6,5],[-71,-34],[1,-212]],[[6554,7561],[-14,-3],[-20,45],[-18,17],[-32,-12],[-12,-20]],[[6458,7588],[-2,15],[7,24],[-5,20],[-32,19],[-13,52],[-15,14],[-1,19],[27,-5],[1,42],[23,9],[25,-8],[5,56],[-5,35],[-28,-2],[-24,14],[-32,-26],[-26,-12]],[[6363,7854],[-14,10],[3,29],[-18,39],[-20,-2],[-24,39],[16,44],[-8,12],[22,63],[29,-34],[3,42],[58,63],[43,2],[61,-40],[33,-24],[30,25],[44,1],[35,-30],[8,17],[39,-2],[7,27],[-45,40],[27,28],[-5,15],[26,15],[-20,40],[13,19],[104,20],[13,15],[70,21],[25,24],[50,-13],[9,-59],[29,14],[35,-20],[-2,-31],[27,3],[69,54],[-10,-18],[35,-44],[62,-147],[15,31],[39,-34],[39,15],[16,-10],[13,-33],[20,-12],[11,-24],[36,8],[15,-36]],[[7229,7621],[-17,9],[-14,20],[-42,6],[-46,2],[-10,-6],[-39,24],[-16,-12],[-4,-34],[-46,20],[-18,-8],[-7,-26]],[[6155,5086],[-20,-23],[-7,-24],[-10,-5],[-4,-40],[-9,-24],[-5,-38],[-12,-19]],[[6088,4913],[-40,58],[-1,33],[-101,117],[-5,7]],[[5941,5128],[0,61],[8,23],[14,38],[10,42],[-13,66],[-3,29],[-13,40]],[[5944,5427],[17,35],[19,38]],[[6162,5408],[-24,-65],[0,-210],[17,-47]],[[7046,7453],[-53,-9],[-34,19],[-30,-4],[3,33],[30,-10],[10,18]],[[6972,7500],[21,-6],[36,42],[-33,30],[-20,-14],[-21,21],[24,38],[-9,5]],[[7849,5884],[-7,70],[18,48],[36,11],[26,-9]],[[7922,6004],[23,-22],[12,39],[25,-21]],[[7982,6000],[6,-38],[-3,-69],[-47,-44],[13,-35],[-30,-4],[-24,-24]],[[7897,5786],[-23,9],[-11,30],[-14,59]],[[8564,7406],[24,-68],[7,-37],[0,-67],[-10,-31],[-25,-11],[-22,-24],[-25,-5],[-3,31],[5,43],[-13,60],[21,10],[-19,49]],[[8504,7356],[2,5],[12,-2],[11,26],[20,3],[11,4],[4,14]],[[5557,7635],[5,13]],[[5562,7648],[7,4],[4,19],[5,3],[4,-8],[5,-4],[3,-9],[5,-2],[5,-11],[4,0],[-3,-14],[-3,-7],[1,-4]],[[5599,7615],[-6,-2],[-17,-9],[-1,-12],[-4,1]],[[6332,6909],[6,-26],[-3,-13],[9,-43]],[[6344,6827],[-19,-2],[-7,28],[-25,5]],[[7922,6004],[9,26],[1,49],[-22,50],[-2,57],[-21,47],[-21,4],[-6,-20],[-16,-2],[-8,10],[-30,-34],[0,52],[7,60],[-19,3],[-2,34],[-12,18]],[[7780,6358],[6,21],[24,38]],[[7837,6476],[17,-45],[12,-53],[34,0],[11,-50],[-18,-15],[-8,-21],[34,-35],[23,-68],[17,-50],[21,-40],[7,-41],[-5,-58]],[[5975,7088],[10,47],[14,40],[0,2]],[[5999,7177],[13,-3],[4,-22],[-15,-22],[-7,-31]],[[4785,5434],[-7,-1],[-29,28],[-25,44],[-24,31],[-18,37]],[[4682,5573],[6,19],[2,16],[12,32],[13,27]],[[5412,6499],[-20,-21],[-15,31],[-44,25]],[[5263,6928],[13,13],[3,24],[-3,24],[19,22],[8,19],[14,16],[2,45]],[[5319,7091],[32,-20],[12,5],[23,-10],[37,-26],[13,-51],[25,-11],[39,-24],[30,-29],[13,15],[13,27],[-6,44],[9,28],[20,27],[19,8],[37,-12],[10,-26],[10,0],[9,-10],[28,-7],[6,-19]],[[5694,6449],[0,-115],[-32,0],[0,-24]],[[5662,6310],[-111,110],[-111,110],[-28,-31]],[[7271,5616],[-4,-60],[-12,-17],[-24,-13],[-13,46],[-5,83],[13,93],[19,-32],[13,-40],[13,-60]],[[5804,3515],[10,-17],[-9,-28],[-4,-19],[-16,-9],[-5,-18],[-10,-6],[-21,44],[15,37],[15,22],[13,12],[12,-18]],[[5631,8311],[-2,15],[3,15],[-13,9],[-29,10]],[[5590,8360],[-6,49]],[[5584,8409],[32,18],[47,-4],[27,6],[4,-12],[15,-4],[26,-28]],[[5652,8287],[-7,18],[-14,6]],[[5584,8409],[1,43],[14,36],[26,20],[22,-43],[22,1],[6,44]],[[5757,8492],[14,-13],[2,-28],[9,-34]],[[4759,6775],[-4,0],[0,-31],[-17,-2],[-9,-13],[-13,0],[-10,8],[-23,-7],[-9,-44],[-9,-5],[-13,-72],[-38,-62],[-9,-80],[-12,-26],[-3,-20],[-63,-5]],[[4527,6416],[1,27],[11,15],[9,30],[-2,20],[10,41],[15,36],[9,9],[8,34],[0,31],[10,35],[19,21],[18,59],[0,1],[14,22],[26,6],[22,40],[14,15],[23,48],[-7,72],[10,49],[4,31],[18,39],[28,26],[21,24],[18,59],[9,36],[20,-1],[17,-24],[26,4],[29,-13],[12,0]],[[5739,7959],[6,9],[19,5],[20,-18],[12,-2],[12,-15],[-2,-20],[11,-9],[4,-24],[9,-15],[-2,-8],[5,-6],[-7,-5],[-16,2],[-3,8],[-6,-5],[2,-10],[-7,-18],[-5,-20],[-7,-6]],[[5784,7802],[-5,26],[3,25],[-1,25],[-16,34],[-9,24],[-9,18],[-8,5]],[[6376,4464],[7,-24],[7,-38],[4,-69],[7,-27],[-2,-28],[-5,-17],[-10,34],[-5,-17],[5,-43],[-2,-24],[-8,-14],[-1,-48],[-11,-67],[-14,-80],[-17,-109],[-11,-80],[-12,-67],[-23,-13],[-24,-25],[-16,15],[-22,21],[-8,30],[-2,51],[-10,46],[-2,41],[5,42],[13,10],[0,19],[13,44],[2,36],[-6,28],[-5,36],[-2,53],[9,32],[4,37],[14,2],[15,12],[11,10],[12,1],[16,33],[23,35],[8,29],[-4,25],[12,-7],[15,40],[1,34],[9,26],[10,-25]],[[2301,6672],[-10,-50],[-5,-42],[-2,-77],[-3,-28],[5,-32],[9,-28],[5,-44],[19,-43],[6,-33],[11,-28],[29,-16],[12,-24],[24,16],[21,6],[21,11],[18,9],[17,24],[7,33],[2,49],[5,17],[19,15],[29,13],[25,-2],[17,5],[6,-12],[-1,-28],[-15,-34],[-6,-35],[5,-10],[-4,-25],[-7,-45],[-7,15],[-6,-1]],[[2438,6020],[-32,62],[-14,18],[-23,15],[-15,-4],[-22,-21],[-14,-6],[-20,15],[-21,11],[-26,26],[-21,8],[-31,27],[-23,28],[-7,15],[-16,4],[-28,18],[-12,26],[-30,33],[-14,36],[-6,28],[9,6],[-3,16],[7,15],[0,20],[-10,26],[-2,23],[-9,29],[-25,57],[-28,45],[-13,36],[-24,23],[-5,15],[4,35],[-14,14],[-17,28],[-7,40],[-14,4],[-17,31],[-13,28],[-1,18],[-15,43],[-10,44],[1,22],[-20,23],[-10,-2],[-15,16],[-5,-24],[5,-27],[2,-44],[10,-23],[21,-40],[4,-14],[4,-4],[4,-20],[5,1],[6,-37],[8,-15],[6,-20],[17,-29],[10,-54],[8,-25],[8,-27],[1,-30],[13,-2],[12,-26],[10,-26],[-1,-10],[-12,-22],[-5,1],[-7,35],[-18,33],[-20,27],[-14,15],[1,42],[-5,31],[-13,18],[-19,26],[-4,-8],[-7,15],[-17,14],[-16,34],[2,4],[11,-3],[11,21],[1,26],[-22,41],[-16,16],[-10,36],[-11,38],[-12,46],[-12,52]],[[1746,7056],[32,4],[35,7],[-2,-12],[41,-28],[64,-40],[55,0],[22,0],[0,24],[48,0],[10,-20],[15,-19],[16,-25],[9,-30],[7,-32],[15,-17],[23,-17],[17,45],[23,1],[19,-23],[14,-39],[10,-34],[16,-33],[6,-40],[8,-27],[22,-18],[20,-13],[10,2]],[[5599,7615],[9,3],[13,1]],[[4661,6024],[10,11],[4,34],[9,1],[20,-16],[15,11],[11,-4],[4,13],[112,1],[6,40],[-5,8],[-13,248],[-14,249],[43,1]],[[5118,6285],[0,-132],[-15,-39],[-2,-35],[-25,-9],[-38,-5],[-10,-21],[-18,-2]],[[4680,5899],[1,18],[-2,22],[-11,16],[-5,33],[-2,36]],[[7737,5754],[-3,43],[9,44],[-10,34],[3,63],[-12,30],[-9,69],[-5,73],[-12,47],[-18,-29],[-32,-41],[-15,5],[-17,14],[9,71],[-6,54],[-21,67],[3,20],[-16,8],[-20,47]],[[7780,6358],[-16,-13],[-16,-25],[-20,-3],[-12,-62],[-12,-10],[14,-51],[17,-42],[12,-38],[-11,-50],[-9,-11],[6,-29],[19,-45],[3,-32],[0,-27],[11,-53],[-16,-53],[-13,-60]],[[5538,7594],[-6,4],[-8,19],[-12,12]],[[5533,7689],[8,-10],[4,-8],[9,-6],[10,-12],[-2,-5]],[[7437,8021],[29,10],[53,50],[42,27],[24,-18],[29,-1],[19,-27],[28,-2],[40,-14],[27,40],[-11,34],[28,60],[31,-24],[26,-7],[32,-15],[6,-43],[39,-24],[26,10],[36,8],[27,-8],[28,-27],[16,-30],[26,1],[35,-9],[26,14],[36,9],[41,41],[17,-6],[14,-20],[33,5]],[[5959,4519],[21,5],[34,-16],[7,7],[19,1],[10,18],[17,-1],[30,22],[22,33]],[[6119,4588],[5,-25],[-1,-58],[3,-50],[1,-90],[5,-29],[-8,-41],[-11,-40],[-18,-35],[-25,-22],[-31,-28],[-32,-62],[-10,-11],[-20,-40],[-11,-14],[-3,-41],[14,-43],[5,-34],[0,-17],[5,2],[-1,-56],[-4,-27],[6,-10],[-4,-24],[-11,-20],[-23,-20],[-34,-31],[-12,-21],[3,-24],[7,-4],[-3,-30]],[[5911,3643],[-21,0]],[[5890,3643],[-2,26],[-4,25]],[[5884,3694],[-3,21],[5,64],[-7,41],[-13,81]],[[5866,3901],[29,66],[7,41],[5,5],[3,34],[-5,17],[1,43],[6,40],[0,73],[-15,19],[-13,4],[-6,14],[-13,12],[-23,-1],[-2,21]],[[5840,4289],[-2,41],[84,48]],[[5922,4378],[16,-28],[8,6],[11,-15],[1,-23],[-6,-27],[2,-40],[19,-36],[8,40],[12,12],[-2,74],[-12,42],[-10,18],[-10,-1],[-7,75],[7,44]],[[4661,6024],[-18,40],[-17,42],[-18,15],[-13,17],[-16,0],[-13,-13],[-14,5],[-10,-18]],[[4542,6112],[-2,31],[8,28],[3,54],[-3,57],[-3,29],[2,28],[-7,28],[-14,25]],[[4526,6392],[6,19],[108,0],[-5,83],[7,29],[26,5],[-1,148],[91,-3],[0,87]],[[5922,4378],[-15,15],[9,53],[9,20],[-6,48],[6,47],[5,15],[-7,49],[-14,26]],[[5909,4651],[28,-11],[5,-16],[10,-27],[7,-78]],[[7836,5541],[7,-6],[16,-34],[12,-39],[2,-39],[-3,-26],[2,-20],[2,-34],[10,-16],[11,-51],[-1,-19],[-19,-4],[-27,43],[-32,45],[-4,30],[-16,38],[-4,48],[-10,31],[4,42],[-7,25]],[[7779,5555],[5,10],[23,-25],[2,-30],[18,7],[9,24]],[[8045,5298],[21,-20],[21,11],[6,49],[12,11],[33,12],[20,46],[14,36]],[[8206,5496],[22,40],[14,45],[11,0],[14,-29],[1,-25],[19,-16],[23,-17],[-2,-23],[-19,-3],[5,-28],[-20,-19]],[[5453,3537],[-20,43],[-11,42],[-6,57],[-7,41],[-9,89],[-1,69],[-3,31],[-11,24],[-15,48],[-14,69],[-6,36],[-23,56],[-2,44]],[[5644,4173],[23,14],[18,-4],[11,-13],[0,-5]],[[5552,3756],[0,-212],[-25,-30],[-15,-4],[-17,11],[-13,4],[-4,25],[-11,15],[-14,-28]],[[9604,3969],[23,-36],[14,-27],[-10,-13],[-16,15],[-19,26],[-18,31],[-19,40],[-4,20],[12,-1],[16,-20],[12,-19],[9,-16]],[[5412,6499],[7,-90],[10,-15],[1,-18],[11,-20],[-6,-24],[-11,-117],[-1,-75],[-35,-54],[-12,-76],[11,-22],[0,-37],[18,-1],[-3,-27]],[[5393,5901],[-5,-1],[-19,63],[-6,2],[-22,-32],[-21,17],[-15,3],[-8,-8],[-17,2],[-16,-25],[-14,-1],[-34,30],[-13,-14],[-14,1],[-10,21],[-28,22],[-30,-7],[-7,-12],[-4,-33],[-8,-24],[-2,-51]],[[5236,5457],[-29,-20],[-11,3],[-10,-13],[-23,1],[-15,36],[-9,42],[-19,38],[-21,-1],[-25,0]],[[2619,5821],[-10,18],[-13,23],[-6,20],[-12,18],[-13,26],[3,9],[4,-9],[2,4]],[[2690,6046],[-2,-6],[-2,-12],[3,-21],[-6,-20],[-3,-23],[-1,-26],[1,-14],[1,-26],[-4,-6],[-3,-25],[2,-15],[-6,-15],[2,-15],[4,-10]],[[5092,8139],[14,16],[24,85],[38,24],[23,-2]],[[5863,9188],[-47,-23],[-22,-6]],[[5573,9162],[-17,-3],[-4,-37],[-53,9],[-7,-32],[-27,0],[-18,-41],[-28,-64],[-43,-81],[10,-20],[-10,-22],[-27,1],[-18,-54],[2,-77],[17,-29],[-9,-68],[-23,-39],[-12,-33]],[[5306,8572],[-19,35],[-55,-67],[-37,-13],[-38,29],[-10,62],[-9,133],[26,37],[73,48],[55,60],[51,80],[66,111],[47,44],[76,72],[61,25],[46,-3],[42,48],[51,-3],[50,12],[87,-43],[-36,-15],[30,-36]],[[5686,9666],[-62,-24],[-49,13],[19,15],[-16,19],[57,11],[11,-21],[40,-13]],[[5506,9772],[92,-43],[-70,-23],[-15,-42],[-25,-11],[-13,-48],[-34,-2],[-59,35],[25,21],[-42,16],[-54,49],[-21,45],[75,21],[16,-20],[39,0],[11,20],[40,2],[35,-20]],[[5706,9813],[55,-21],[-41,-31],[-81,-6],[-82,9],[-5,16],[-40,1],[-30,26],[86,17],[40,-14],[28,17],[70,-14]],[[9805,2826],[6,-24],[20,24],[8,-25],[0,-24],[-10,-26],[-18,-43],[-14,-23],[10,-28],[-22,0],[-23,-22],[-8,-38],[-16,-58],[-21,-26],[-14,-16],[-26,1],[-18,19],[-30,4],[-5,21],[15,43],[35,57],[18,11],[20,21],[24,31],[16,29],[13,43],[10,15],[5,32],[19,27],[6,-25]],[[9849,3100],[20,-60],[1,39],[13,-16],[4,-43],[22,-19],[19,-4],[16,22],[14,-7],[-7,-51],[-8,-34],[-22,1],[-7,-17],[3,-25],[-4,-11],[-11,-31],[-14,-39],[-21,-23],[-5,15],[-12,8],[16,48],[-9,31],[-30,23],[1,21],[20,20],[5,45],[-1,37],[-12,39],[1,10],[-13,23],[-22,51],[-12,41],[11,5],[15,-32],[21,-15],[8,-52]],[[6475,6141],[-9,41],[-22,95]],[[6444,6277],[83,57],[19,115],[-13,41]],[[6566,6618],[12,-40],[16,-21],[20,-7],[17,-11],[12,-33],[8,-19],[10,-7],[0,-13],[-10,-34],[-5,-16],[-12,-19],[-10,-39],[-13,3],[-5,-14],[-5,-29],[4,-39],[-3,-7],[-13,1],[-17,-22],[-3,-28],[-6,-12],[-18,0],[-10,-14],[0,-23],[-14,-16],[-15,5],[-19,-19],[-12,-4]],[[6557,6683],[8,19],[3,-5],[-2,-23],[-4,-11]],[[6893,6547],[-20,14],[-9,42],[-21,44],[-51,-11],[-45,-1],[-39,-8]],[[2836,5598],[-9,17],[-6,31],[7,16],[-7,3],[-5,19],[-14,16],[-12,-3],[-6,-20],[-11,-15],[-6,-2],[-3,-12],[13,-31],[-7,-7],[-4,-9],[-13,-3],[-5,35],[-4,-10],[-9,3],[-5,23],[-12,4],[-7,7],[-12,0],[-1,-13],[-3,9]],[[2707,5733],[10,-20],[-1,-13],[11,-2],[3,5],[8,-15],[13,5],[12,14],[17,12],[9,17],[16,-3],[-1,-6],[15,-2],[12,-10],[10,-17],[10,-16]],[[3045,4126],[-28,33],[-2,24],[-55,57],[-50,63],[-22,36],[-11,47],[4,17],[-23,76],[-28,106],[-26,115],[-11,26],[-9,42],[-21,38],[-20,23],[9,26],[-14,55],[9,40],[22,36]],[[8510,5667],[2,-38],[2,-33],[-9,-52],[-11,58],[-13,-29],[9,-42],[-8,-27],[-32,33],[-8,42],[8,27],[-17,28],[-9,-24],[-13,2],[-21,-32],[-4,17],[11,48],[17,16],[15,22],[10,-26],[21,16],[5,25],[19,2],[-1,44],[22,-27],[3,-29],[2,-21]],[[8443,5774],[-10,-19],[-9,-36],[-8,-17],[-17,40],[5,15],[7,16],[3,36],[16,3],[-5,-38],[21,55],[-3,-55]],[[8291,5719],[-37,-55],[14,41],[20,35],[16,40],[15,57],[5,-47],[-18,-31],[-15,-40]],[[8385,5867],[16,-18],[18,0],[0,-24],[-13,-24],[-18,-17],[-1,26],[2,30],[-4,27]],[[8485,5883],[8,-64],[-21,15],[0,-20],[7,-35],[-13,-13],[-1,41],[-9,3],[-4,34],[16,-4],[0,22],[-17,44],[27,-2],[7,-21]],[[8375,5935],[-7,-50],[-12,29],[-15,44],[24,-2],[10,-21]],[[8369,6248],[17,-16],[9,15],[2,-15],[-4,-24],[9,-41],[-7,-48],[-16,-19],[-5,-47],[7,-45],[14,-7],[13,7],[34,-32],[-2,-31],[9,-14],[-3,-27],[-22,29],[-10,30],[-7,-21],[-18,34],[-25,-8],[-14,12],[1,24],[9,15],[-8,13],[-4,-21],[-14,34],[-4,25],[-1,55],[11,-19],[3,90],[9,52],[17,0]],[[9329,4790],[-8,-6],[-12,22],[-12,37],[-6,44],[4,5],[3,-17],[8,-13],[14,-37],[13,-19],[-4,-16]],[[9221,4867],[-15,-5],[-4,-16],[-15,-14],[-15,-13],[-14,0],[-23,16],[-16,17],[2,17],[25,-8],[15,4],[5,28],[4,1],[2,-30],[16,4],[8,20],[16,21],[-4,33],[17,2],[6,-10],[-1,-32],[-9,-35]],[[8916,5033],[48,-40],[51,-33],[19,-29],[16,-29],[4,-34],[46,-36],[7,-30],[-25,-7],[6,-38],[25,-38],[18,-61],[15,2],[-1,-25],[22,-10],[-9,-11],[30,-24],[-3,-17],[-18,-4],[-7,15],[-24,6],[-28,9],[-22,37],[-16,32],[-14,50],[-36,25],[-24,-16],[-17,-19],[4,-43],[-22,-20],[-16,10],[-28,2]],[[9253,4923],[-9,-15],[-5,34],[-6,22],[-13,19],[-16,25],[-20,17],[8,14],[15,-17],[9,-12],[12,-14],[11,-24],[11,-19],[3,-30]],[[5392,8278],[19,17],[43,26],[35,20],[28,-10],[2,-14],[27,-1]],[[5546,8316],[34,-6],[51,1]],[[5653,8153],[14,-51],[-3,-16],[-14,-7],[-25,-48],[7,-25],[-6,3]],[[5626,8009],[-26,22],[-20,-8],[-13,6],[-17,-12],[-14,20],[-11,-8],[-2,4]],[[3159,6249],[14,-5],[5,-12],[-7,-14],[-21,0],[-17,-2],[-1,25],[4,8],[23,0]],[[8628,7624],[4,-10]],[[8632,7614],[-11,3],[-12,-19],[-8,-20],[1,-41],[-14,-13],[-5,-10],[-11,-17],[-18,-10],[-12,-15],[-1,-25],[-3,-7],[11,-9],[15,-25]],[[8504,7356],[-13,11],[-4,-11],[-8,-4],[-1,10],[-7,6],[-8,9],[8,25],[7,7],[-3,10],[7,32],[-2,9],[-16,6],[-13,16]],[[4792,7319],[-11,-15],[-14,8],[-15,-7],[5,46],[-3,35],[-12,5],[-7,22],[2,38],[11,21],[2,23],[6,35],[-1,24],[-5,21],[-1,19]],[[6411,6608],[-2,42],[7,30],[8,6],[8,-18],[1,-34],[-6,-33]],[[6427,6601],[-8,-5],[-8,12]],[[5630,7940],[12,12],[17,-6],[18,-1],[13,-14],[10,9],[20,6],[7,13],[12,0]],[[5784,7802],[12,-11],[13,9],[13,-9]],[[5822,7791],[0,-15],[-13,-13],[-9,6],[-7,-70]],[[5629,7730],[-5,10],[6,9],[-7,8],[-8,-13],[-17,16],[-2,24],[-17,14],[-3,18],[-15,23]],[[8989,8105],[28,-102],[-41,19],[-17,-84],[27,-59],[-1,-40],[-21,35],[-18,-45],[-5,49],[3,56],[-3,62],[6,43],[2,77],[-17,57],[3,79],[25,26],[-11,27],[13,8],[7,-38],[10,-56],[-1,-56],[11,-58]],[[5546,8316],[6,26],[38,18]],[[0,9154],[68,-44],[73,-58],[-3,-35],[19,-15],[-6,42],[75,-8],[55,-54],[-28,-25],[-46,-6],[0,-57],[-11,-12],[-26,2],[-22,20],[-36,17],[-7,25],[-28,9],[-31,-7],[-16,20],[6,21],[-33,-13],[13,-27],[-16,-25]],[[0,8924],[0,230]],[[0,9301],[9999,-40],[-30,-3],[-5,19],[-9964,24]],[[0,9301],[4,2],[23,0],[40,-17],[-2,-7],[-29,-14],[-36,-4],[0,40]],[[8988,9398],[-42,0],[-57,6],[-5,3],[27,23],[34,5],[40,-22],[3,-15]],[[9186,9506],[-32,-23],[-44,5],[-52,23],[7,19],[51,-9],[70,-15]],[[9029,9534],[-22,-43],[-102,1],[-46,-13],[-55,37],[15,40],[37,11],[73,-3],[100,-30]],[[6598,9255],[-17,-5],[-91,7],[-7,26],[-50,15],[-4,31],[28,13],[-1,31],[55,49],[-25,7],[66,51],[-7,26],[62,30],[91,37],[93,11],[48,21],[54,8],[19,-23],[-19,-18],[-98,-28],[-85,-28],[-86,-55],[-42,-56],[-43,-55],[5,-48],[54,-47]],[[0,8924],[9963,-25],[-36,4],[25,-31],[17,-47],[13,-16],[3,-24],[-7,-15],[-52,13],[-78,-44],[-25,-6],[-42,-41],[-40,-35],[-11,-26],[-39,39],[-73,-45],[-12,22],[-27,-25],[-37,8],[-9,-38],[-33,-56],[1,-23],[31,-13],[-4,-84],[-25,-2],[-12,-48],[11,-25],[-48,-29],[-10,-66],[-41,-14],[-9,-59],[-40,-53],[-10,40],[-12,84],[-15,127],[13,80],[23,35],[2,27],[43,12],[50,73],[47,59],[50,46],[23,81],[-34,-5],[-17,-47],[-70,-63],[-23,71],[-72,-20],[-69,-96],[23,-36],[-62,-15],[-43,-6],[2,42],[-43,9],[-35,-29],[-85,10],[-91,-17],[-90,-112],[-106,-136],[43,-7],[14,-36],[27,-13],[18,29],[30,-4],[40,-63],[1,-49],[-21,-58],[-3,-69],[-12,-92],[-42,-83],[-9,-40],[-38,-67],[-38,-67],[-18,-34],[-37,-33],[-17,-1],[-17,28],[-38,-42],[-4,-19]],[[6363,7854],[-12,-34],[-27,-9],[-28,-60],[25,-54],[-2,-39],[30,-68]],[[6109,7684],[-35,48],[-32,22],[-24,34],[20,9],[23,48],[-15,23],[41,23],[-1,13],[-25,-9]],[[6061,7895],[1,25],[14,16],[27,5],[5,19],[-7,32],[12,30],[-1,17],[-41,18],[-16,0],[-17,27],[-21,-9],[-35,20],[0,11],[-10,25],[-22,3],[-2,18],[7,11],[-18,33],[-29,-5],[-8,2],[-7,-13],[-11,3]],[[5777,8607],[31,32],[-29,27]],[[5863,9188],[29,20],[46,-35],[76,-14],[105,-65],[21,-27],[2,-38],[-31,-31],[-45,-15],[-124,44],[-21,-8],[45,-42],[2,-27],[2,-58],[36,-18],[22,-15],[3,28],[-17,25],[18,22],[67,-36],[24,14],[-19,42],[65,56],[25,-3],[26,-20],[16,39],[-23,35],[14,34],[-21,36],[78,-18],[16,-33],[-35,-7],[0,-32],[22,-20],[43,13],[7,37],[58,27],[97,49],[20,-2],[-27,-35],[35,-6],[19,19],[52,2],[42,24],[31,-35],[32,38],[-29,34],[14,19],[82,-18],[39,-18],[100,-66],[19,31],[-28,30],[-1,12],[-34,6],[10,27],[-15,45],[-1,19],[51,52],[18,52],[21,11],[74,-15],[5,-32],[-26,-47],[17,-18],[9,-40],[-6,-79],[31,-35],[-12,-39],[-55,-82],[32,-8],[11,21],[31,14],[7,29],[24,27],[-16,33],[13,38],[-31,5],[-6,32],[22,58],[-36,47],[50,38],[-7,41],[14,2],[15,-32],[-11,-56],[29,-10],[-12,41],[46,23],[58,3],[51,-33],[-25,48],[-2,61],[48,12],[67,-3],[60,8],[-23,30],[33,38],[31,1],[54,29],[74,8],[9,15],[73,6],[23,-13],[62,31],[51,-1],[8,24],[26,25],[66,24],[48,-19],[-38,-14],[63,-9],[7,-29],[25,14],[82,0],[62,-28],[23,-22],[-7,-30],[-31,-17],[-73,-32],[-21,-17],[35,-8],[41,-15],[25,11],[14,-37],[12,15],[44,9],[90,-9],[6,-27],[116,-9],[2,44],[59,-10],[44,1],[45,-31],[13,-37],[-17,-24],[35,-45],[44,-23],[27,60],[44,-26],[48,16],[53,-18],[21,16],[45,-8],[-20,53],[37,25],[251,-37],[24,-34],[72,-44],[112,11],[56,-10],[23,-24],[-4,-42],[35,-16],[37,12],[49,1],[52,-11],[53,6],[49,-51],[34,18],[-23,37],[13,26],[88,-16],[58,3],[80,-27],[-9960,-25]],[[7918,9692],[-157,-23],[51,76],[23,6],[21,-3],[70,-33],[-8,-23]],[[6420,9821],[-37,-8],[-25,-4],[-4,-10],[-33,-9],[-30,13],[16,18],[-62,2],[54,11],[43,0],[5,-15],[16,14],[26,9],[42,-13],[-11,-8]],[[7775,9725],[-60,-8],[-78,17],[-46,22],[-21,41],[-38,12],[72,39],[60,13],[54,-29],[64,-56],[-7,-51]],[[5844,5117],[11,-32],[-1,-34],[-8,-8]],[[5821,5105],[7,-6],[16,18]],[[4526,6392],[1,24]],[[6188,6124],[-4,24],[-8,18],[-2,23],[-15,20],[-15,49],[-7,47],[-20,39],[-12,10],[-18,55],[-4,40],[2,34],[-16,64],[-13,22],[-15,12],[-10,33],[2,13],[-8,30],[-8,13],[-11,42],[-17,47],[-14,39],[-14,0],[5,32],[1,20],[3,23]],[[6344,6827],[11,-50],[14,-13],[5,-20],[18,-25],[2,-23],[-3,-20],[4,-19],[8,-16],[4,-19],[4,-14]],[[6427,6601],[5,-22]],[[6444,6277],[-80,-23],[-26,-25],[-20,-61],[-13,-10],[-7,20],[-11,-3],[-27,6],[-5,5],[-32,-1],[-7,-5],[-12,15],[-7,-29],[3,-24],[-12,-18]],[[5943,5727],[-4,2],[0,28],[-3,20],[-14,23],[-4,41],[4,43],[-13,4],[-2,-13],[-17,-3],[7,-17],[2,-34],[-15,-32],[-14,-42],[-14,-6],[-23,34],[-11,-12],[-3,-17],[-14,-10],[-1,-12],[-28,0],[-3,12],[-20,1],[-10,-9],[-8,5],[-14,33],[-5,16],[-20,-8],[-8,-27],[-7,-51],[-10,-11],[-8,-6]],[[5663,5679],[-2,2]],[[5635,5824],[0,14],[-10,17],[-1,33],[-5,23],[-10,-4],[3,21],[7,24],[-3,24],[9,18],[-6,13],[7,36],[13,42],[24,-4],[-1,229]],[[6023,6449],[9,-56],[-6,-11],[4,-59],[11,-69],[10,-14],[15,-21]],[[5943,5734],[0,-7]],[[5943,5727],[0,-44]],[[5944,5427],[-17,-26],[-20,0],[-22,-14],[-18,13],[-11,-15]],[[5682,5656],[-19,23]],[[4535,5965],[-11,45],[-14,21],[12,11],[14,40],[6,30]],[[4536,5896],[-4,44]],[[9502,4579],[8,-20],[-19,0],[-11,36],[17,-14],[5,-2]],[[9467,4614],[-11,-1],[-17,5],[-5,9],[1,23],[19,-9],[9,-12],[4,-15]],[[9490,4630],[-4,-11],[-21,50],[-5,34],[9,0],[10,-46],[11,-27]],[[9440,4702],[1,-11],[-22,24],[-15,21],[-10,19],[4,6],[13,-14],[23,-26],[6,-19]],[[9375,4759],[-5,-3],[-13,13],[-11,24],[1,9],[17,-24],[11,-19]],[[4682,5573],[-8,4],[-20,24],[-14,31],[-5,21],[-3,42]],[[2561,5953],[-3,-13],[-16,0],[-10,6],[-12,11],[-15,4],[-8,12]],[[6198,5842],[9,-10],[5,-24],[13,-24],[14,0],[26,14],[30,7],[25,18],[13,4],[10,10],[16,3]],[[6359,5840],[0,-1],[0,-24],[0,-58],[0,-30],[-13,-36],[-19,-48]],[[6359,5840],[9,1],[13,8],[14,6],[14,20],[10,0],[1,-16],[-3,-34],[0,-30],[-6,-21],[-7,-62],[-14,-64],[-17,-74],[-24,-84],[-23,-65],[-33,-78],[-28,-47],[-42,-57],[-25,-44],[-31,-69],[-6,-31],[-6,-13]],[[3412,5526],[34,-11],[2,10],[23,4],[30,-15]],[[5626,8009],[-8,-15],[-5,-23]],[[5380,7803],[7,5]],[[5663,8983],[-47,-16],[-27,-40],[4,-35],[-44,-47],[-54,-49],[-20,-81],[20,-41],[26,-32],[-25,-65],[-29,-13],[-11,-97],[-15,-54],[-34,6],[-16,-46],[-32,-3],[-9,55],[-23,65],[-21,82]],[[5890,3643],[-5,-26],[-17,-6],[-16,31],[0,20],[7,22],[3,17],[8,4],[14,-11]],[[5999,7177],[-2,44],[7,24]],[[6004,7245],[7,13],[7,12],[2,33],[9,-12],[31,16],[14,-10],[23,0],[32,21],[15,-1],[32,9]],[[5051,5536],[-22,-12]],[[7849,5884],[-25,27],[-24,-1],[4,45],[-24,-1],[-2,-63],[-15,-84],[-10,-51],[2,-42],[18,-1],[12,-53],[5,-50],[15,-33],[17,-6],[14,-30]],[[7779,5555],[-11,22],[-4,28],[-15,33],[-14,27],[-4,-34],[-5,32],[3,36],[8,55]],[[6883,7321],[16,59],[-6,43],[-20,13],[7,26],[23,-3],[13,32],[9,37],[37,13],[-6,-27],[4,-16],[12,2]],[[6497,7324],[-5,41],[4,60],[-22,20],[8,39],[-19,4],[6,48],[26,-14],[25,19],[-20,34],[-8,33],[-23,-15],[-3,-42],[-8,37]],[[6554,7561],[31,1],[-4,29],[24,20],[23,33],[37,-30],[3,-46],[11,-12],[30,3],[9,-11],[14,-59],[32,-40],[18,-27],[29,-28],[37,-25],[-1,-35]],[[8471,4670],[3,14],[24,13],[19,2],[9,7],[10,-7],[-10,-16],[-29,-25],[-23,-16]],[[3286,5802],[16,8],[6,-2],[-1,-43],[-23,-7],[-5,5],[8,16],[-1,23]],[[5233,7310],[31,23],[19,-7],[-1,-29],[24,21],[2,-11],[-14,-28],[0,-27],[9,-14],[-3,-50],[-19,-29],[6,-31],[14,-1],[7,-27],[11,-9]],[[6004,7245],[-11,26],[11,22],[-17,-5],[-23,13],[-19,-33],[-43,-6],[-22,31],[-30,1],[-6,-23],[-20,-7],[-26,30],[-31,-1],[-16,58],[-21,32],[14,44],[-18,28],[31,55],[43,2],[12,44],[53,-8],[33,38],[32,16],[46,1],[49,-40],[40,-23],[32,9],[24,-5],[33,30]],[[5777,7601],[3,-22],[25,-18],[-5,-14],[-33,-4],[-12,-17],[-23,-31],[-9,26],[0,12]],[[8382,6587],[-17,-92],[-12,-47],[-14,48],[-4,43],[17,56],[22,44],[13,-17],[-5,-35]],[[6088,4913],[-12,-71],[1,-32],[18,-21],[1,-15],[-8,-35],[2,-18],[-2,-27],[10,-36],[11,-57],[10,-13]],[[5909,4651],[-15,17],[-18,10],[-11,10],[-12,14]],[[5844,5117],[10,7],[31,-1],[56,5]],[[6061,7895],[-22,-5],[-18,-18],[-26,-4],[-24,-21],[1,-36],[14,-14],[28,4],[-5,-21],[-31,-10],[-37,-33],[-16,12],[6,27],[-30,17],[5,11],[26,19],[-8,13],[-43,14],[-2,22],[-25,-7],[-11,-32],[-21,-42]],[[3517,3238],[-12,-36],[-31,-32],[-21,11],[-15,-6],[-26,25],[-18,-2],[-17,32]],[[679,6281],[-4,-9],[-7,8],[1,16],[-4,21],[1,6],[5,10],[-2,11],[1,6],[3,-2],[10,-9],[5,-5],[5,-8],[7,-20],[-1,-3],[-11,-13],[-9,-9]],[[664,6371],[-9,-4],[-5,12],[-3,5],[0,3],[3,5],[9,-5],[8,-9],[-3,-7]],[[646,6402],[-1,-6],[-15,1],[2,7],[14,-2]],[[621,6410],[-2,-3],[-2,1],[-9,2],[-4,13],[-1,2],[7,8],[3,-4],[8,-19]],[[574,6448],[-4,-5],[-9,10],[1,4],[5,6],[6,-1],[1,-14]],[[3135,7782],[5,-19],[-30,-28],[-29,-20],[-29,-17],[-15,-34],[-4,-13],[-1,-31],[10,-30],[11,-2],[-3,21],[8,-12],[-2,-17],[-19,-9],[-13,1],[-20,-10],[-12,-3],[-17,-3],[-23,-17],[41,11],[8,-11],[-39,-17],[-17,0],[0,7],[-8,-16],[8,-3],[-6,-41],[-20,-44],[-2,15],[-6,3],[-9,14],[5,-31],[7,-10],[1,-22],[-9,-22],[-16,-46],[-2,2],[8,39],[-14,22],[-3,48],[-5,-25],[5,-37],[-18,9],[19,-18],[1,-55],[8,-4],[3,-20],[4,-57],[-17,-43],[-29,-17],[-18,-34],[-14,-4],[-14,-21],[-4,-19],[-31,-38],[-16,-27],[-13,-34],[-4,-41],[5,-40],[9,-49],[13,-41],[0,-25],[13,-67],[-1,-39],[-1,-22],[-7,-35],[-8,-7],[-14,7],[-4,25],[-11,13],[-15,50],[-13,44],[-4,22],[6,38],[-8,32],[-22,48],[-10,9],[-28,-26],[-5,3],[-14,27],[-17,14],[-32,-7],[-24,6],[-21,-4],[-12,-9],[5,-15],[0,-23],[5,-12],[-5,-7],[-10,8],[-11,-11],[-20,2],[-20,30],[-25,-7],[-20,14],[-17,-5],[-24,-13],[-25,-43],[-27,-25],[-16,-27],[-6,-26],[0,-40],[1,-27],[5,-20]],[[1746,7056],[-4,29],[-18,33],[-13,7],[-3,17],[-16,3],[-10,15],[-26,6],[-7,9],[-3,32],[-27,58],[-23,80],[1,13],[-13,19],[-21,48],[-4,47],[-15,32],[6,48],[-1,49],[-8,44],[10,54],[4,53],[3,52],[-5,77],[-9,49],[-8,27],[4,11],[40,-19],[15,-55],[7,16],[-5,47],[-9,47]],[[750,8471],[-28,-22],[-14,15],[-4,27],[25,21],[15,8],[18,-3],[12,-18],[-24,-28]],[[401,8632],[-18,-9],[-18,11],[-17,16],[28,10],[22,-6],[3,-22]],[[230,8855],[17,-11],[17,6],[23,-15],[27,-8],[-2,-6],[-21,-12],[-21,12],[-11,11],[-24,-4],[-7,6],[2,21]],[[1374,8338],[-15,22],[-25,18],[-8,50],[-36,47],[-15,54],[-26,4],[-44,1],[-33,17],[-57,60],[-27,11],[-49,20],[-38,-5],[-55,27],[-33,24],[-30,-12],[5,-40],[-15,-3],[-32,-13],[-25,-19],[-30,-12],[-4,34],[12,56],[30,18],[-8,14],[-35,-32],[-19,-38],[-40,-41],[20,-28],[-26,-41],[-30,-24],[-28,-18],[-7,-25],[-43,-30],[-9,-27],[-32,-25],[-20,5],[-25,-16],[-29,-20],[-23,-19],[-47,-17],[-5,10],[31,27],[27,18],[29,31],[35,7],[14,23],[38,35],[6,11],[21,21],[5,43],[14,34],[-32,-17],[-9,10],[-15,-21],[-18,29],[-8,-21],[-10,29],[-28,-23],[-17,0],[-3,34],[5,21],[-17,21],[-37,-11],[-23,27],[-19,14],[0,32],[-22,25],[11,33],[23,32],[10,30],[22,4],[19,-9],[23,27],[20,-5],[21,18],[-5,27],[-16,10],[21,22],[-17,0],[-30,-13],[-8,-13],[-22,13],[-39,-6],[-41,13],[-12,23],[-35,34],[39,24],[62,28],[23,0],[-4,-29],[59,3],[-23,35],[-34,22],[-20,29],[-26,25],[-38,18],[15,30],[49,2],[35,26],[7,28],[28,27],[28,7],[52,26],[26,-4],[42,30],[42,-12],[21,-26],[12,12],[47,-4],[-2,-13],[43,-10],[28,6],[59,-18],[53,-6],[21,-7],[37,9],[42,-17],[31,-8]],[[3018,5861],[-1,-14],[-16,-7],[9,-26],[0,-30],[-12,-33],[10,-46],[12,4],[6,41],[-8,20],[-2,44],[35,23],[-4,28],[10,18],[10,-41],[19,-1],[18,-32],[1,-19],[25,0],[30,6],[16,-26],[21,-7],[16,18],[0,14],[34,4],[34,1],[-24,-18],[10,-27],[22,-4],[21,-28],[4,-46],[15,1],[11,-14]],[[8001,6424],[-37,-50],[-24,-54],[-6,-40],[22,-61],[25,-75],[26,-36],[17,-46],[12,-106],[-3,-102],[-24,-38],[-31,-37],[-23,-48],[-35,-53],[-10,37],[8,39],[-21,32]],[[9661,4234],[-9,-7],[-9,25],[1,15],[17,-33]],[[9641,4323],[4,-47],[-7,7],[-6,-3],[-4,16],[0,44],[13,-17]],[[6475,6141],[-21,-15],[-5,-26],[-1,-19],[-27,-25],[-45,-27],[-24,-40],[-13,-3],[-8,3],[-16,-24],[-18,-11],[-23,-3],[-7,-3],[-6,-15],[-8,-5],[-4,-14],[-14,1],[-9,-8],[-19,3],[-7,34],[1,31],[-5,17],[-5,43],[-8,23],[5,3],[-2,27],[3,11],[-1,25]],[[5817,3910],[11,0],[14,-10],[9,7],[15,-6]],[[5911,3643],[-7,-42],[-3,-48],[-7,-26],[-19,-29],[-5,-9],[-12,-29],[-8,-29],[-16,-42],[-31,-59],[-20,-35],[-21,-26],[-29,-22],[-14,-3],[-3,-16],[-17,8],[-14,-11],[-30,11],[-17,-7],[-12,3],[-28,-22],[-24,-9],[-17,-22],[-13,-2],[-11,21],[-10,1],[-12,26],[-1,-8],[-4,15],[0,34],[-9,39],[9,10],[0,44],[-19,54],[-14,49],[-20,75]],[[5840,4289],[-21,-7],[-15,-23],[-4,-20],[-10,-5],[-24,-47],[-15,-37],[-10,-2],[-9,7],[-31,6]]],"transform":{"scale":[0.036003600360036005,0.017366249624962495],"translate":[-180,-90]}};
  Datamap.prototype.usaTopo = '__USA__';

  /**************************************
                Utilities
  ***************************************/

  //convert lat/lng coords to X / Y coords
  Datamap.prototype.latLngToXY = function(lat, lng) {
     return this.projection([lng, lat]);
  };

  //add <g> layer to root SVG
  Datamap.prototype.addLayer = function( className, id, first ) {
    var layer;
    if ( first ) {
      layer = this.svg.insert('g', ':first-child')
    }
    else {
      layer = this.svg.append('g')
    }
    return layer.attr('id', id || '')
      .attr('class', className || '');
  };

  Datamap.prototype.updateChoropleth = function(data) {
    var svg = this.svg;
    for ( var subunit in data ) {
      if ( data.hasOwnProperty(subunit) ) {
        var color;
        var subunitData = data[subunit]
        if ( ! subunit ) {
          continue;
        }
        else if ( typeof subunitData === "string" ) {
          color = subunitData;
        }
        else if ( typeof subunitData.color === "string" ) {
          color = subunitData.color;
        }
        else {
          color = this.options.fills[ subunitData.fillKey ];
        }
        //if it's an object, overriding the previous data
        if ( subunitData === Object(subunitData) ) {
          this.options.data[subunit] = defaults(subunitData, this.options.data[subunit] || {});
          var geo = this.svg.select('.' + subunit).attr('data-info', JSON.stringify(this.options.data[subunit]));
        }
        svg
          .selectAll('.' + subunit)
          .transition()
            .style('fill', color);
      }
    }
  };

  Datamap.prototype.updatePopup = function (element, d, options) {
    var self = this;
    element.on('mousemove', null);
    element.on('mousemove', function() {
      var position = d3.mouse(this);
      d3.select(self.svg[0][0].parentNode).select('.datamaps-hoverover')
        .style('top', ( (position[1] + 30)) + "px")
        .html(function() {
          var data = JSON.parse(element.attr('data-info'));
          //if ( !data ) return '';
          return options.popupTemplate(d, data);
        })
        .style('left', ( position[0]) + "px");
    });

    d3.select(self.svg[0][0].parentNode).select('.datamaps-hoverover').style('display', 'block');
  };

  Datamap.prototype.addPlugin = function( name, pluginFn ) {
    var self = this;
    if ( typeof Datamap.prototype[name] === "undefined" ) {
      Datamap.prototype[name] = function(data, options, callback, createNewLayer) {
        var layer;
        if ( typeof createNewLayer === "undefined" ) {
          createNewLayer = false;
        }

        if ( typeof options === 'function' ) {
          callback = options;
          options = undefined;
        }

        options = defaults(options || {}, defaultOptions[name + 'Config']);

        //add a single layer, reuse the old layer
        if ( !createNewLayer && this.options[name + 'Layer'] ) {
          layer = this.options[name + 'Layer'];
          options = options || this.options[name + 'Options'];
        }
        else {
          layer = this.addLayer(name);
          this.options[name + 'Layer'] = layer;
          this.options[name + 'Options'] = options;
        }
        pluginFn.apply(this, [layer, data, options]);
        if ( callback ) {
          callback(layer);
        }
      };
    }
  };

  // expose library
  if ( typeof define === "function" && define.amd ) {
    define( "datamaps", function(require) { d3 = require('d3'); topojson = require('topojson'); return Datamap; } );
  }
  else {
    window.Datamap = window.Datamaps = Datamap;
  }

  if ( window.jQuery ) {
    window.jQuery.fn.datamaps = function(options, callback) {
      options = options || {};
      options.element = this[0];
      var datamap = new Datamap(options);
      if ( typeof callback === "function" ) {
        callback(datamap, options);
      }
      return this;
    };
  }
})();