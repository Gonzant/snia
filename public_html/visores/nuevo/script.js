  require([
    "esri/map",
    "esri/layers/FeatureLayer",
    "esri/renderers/UniqueValueRenderer",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/Color",
    "esri/dijit/PopupTemplate",
    "esri/dijit/Legend",    
    "esri/dijit/Scalebar", 
    "esri/layers/ArcGISDynamicMapServiceLayer", 
    "esri/TimeExtent", 
    "esri/dijit/TimeSlider",
    "dojo/_base/array",
    "dojo/dom",
    "dojo/domReady!"
  ], function(Map, FeatureLayer, UniqueValueRenderer,
    SimpleFillSymbol, SimpleLineSymbol, Color,
    PopupTemplate, Legend,Scalebar,
    ArcGISDynamicMapServiceLayer,TimeExtent, TimeSlider,arrayUtils,dom

  ) {
    var styleMasMenos = function()
    {
       $('.esriSimpleSliderTL').css('right','10px');
       $('.esriSimpleSliderTL').css('left','auto');
       $('.esriSimpleSliderTL').css('top','110px');
    }

    var styleScaleBar = function()
    {
        $('.esriScalebar').css('width','165px');
        $('.esriScalebar').css('padding','10px');
        $('.esriScalebar').css('height','33px');
        $('.esriScalebar').css('background-color','rgba(255, 255, 255, 0.80)');      
    }

    var styleDoubleSlider = function()
    {  
        $('.dijitSliderImageHandleH').css('-webkit-appearance','none !important');
        $('.dijitSliderImageHandleH').css('background-color','#ffffff');
        $('.dijitSliderImageHandleH').css('border','3px solid #E57500');
        $('.dijitSliderImageHandleH').css('border-radius','10px');
        $('.dijitSliderImageHandleH').css('height','10px');
        $('.dijitSliderImageHandleH').css('width','10px');
        $('.dijitSliderImageHandleH').css('top','-5px');
         
        $('.dijitButtonNode').css('border','0');
        $('.dijitSliderProgressBar').css('background-color','#E57500');
        $('#timeInfo').css('background-color','rgba(255, 255, 255, 0.80)');
        $('#timeInfo').css('border-radius','0px');      
        $('#timeInfo').css('border-top-width','0');
        $('#timeInfo').css('border-left-width','0');
        $('#timeInfo').css('border-bottom-width','0');
        $('#timeInfo').css('border-right-width','0');
        $('#timeInfo').css('height','45px');
        $('#timeSliderDiv').css('padding-top','12px');

        $('.esriTimeSlider .tsButton').css('background-image','url(images/time_slider_sprite.png)');     
    }

    var map = new Map("viewDiv", {
      basemap: "streets",
      center: [ -95, 39 ],
      zoom: 5
    });  
     var scalebar = new Scalebar({
          map: map,
          // "dual" displays both miles and kilometers
          // "english" is the default, which displays miles
          // use "metric" for kilometers
          scalebarUnit: "dual"
        });

     

      var opLayer = new ArcGISDynamicMapServiceLayer("https://sampleserver3.arcgisonline.com/ArcGIS/rest/services/Petroleum/KSWells/MapServer");
      opLayer.setVisibleLayers([0]);

      //apply a definition expression so only some features are shown 
      var layerDefinitions = [];
      layerDefinitions[0] = "FIELD_KID=1000148164";
      
      //add the gas fields layer to the map 
      map.addLayers([opLayer]);

      map.on("layers-add-result", initSlider);

      function initSlider() {
        var timeSlider = new TimeSlider({
          style: "width: 100%;"
        }, dom.byId("timeSliderDiv"));
        map.setTimeSlider(timeSlider);
        
        var timeExtent = new TimeExtent();
        timeExtent.startTime = new Date("1/1/1921 UTC");
        timeExtent.endTime = new Date("12/31/2009 UTC");
        timeSlider.setThumbCount(2);
        timeSlider.createTimeStopsByTimeInterval(timeExtent, 2, "esriTimeUnitsYears");
        timeSlider.setThumbIndexes([0,1]);
        timeSlider.setThumbMovingRate(2000);
        timeSlider.startup();
        
        //add labels for every other time stop
        var labels = arrayUtils.map(timeSlider.timeStops, function(timeStop, i) { 
          if ( i % 2 === 0 ) {
            return timeStop.getUTCFullYear(); 
          } else {
            return "";
          }
        }); 
        
        timeSlider.setLabels(labels);
        
        timeSlider.on("time-extent-change", function(evt) {
          var startValString = evt.startTime.getUTCFullYear();
          var endValString = evt.endTime.getUTCFullYear();
          dom.byId("daterange").innerHTML = "<i>" + startValString + " and " + endValString  + "<\/i>";
        });

        styleScaleBar();
        styleDoubleSlider();
        styleMasMenos();
      }
  });

$(document).ready(function(){
    $("#botonTabs").click(function(){
        if($("#tabs").is(":visible"))        
             $("#tabs").hide('fast');        
        else
             $("#tabs").show('fast');
    });

    $(".navTabItem").click(function(obj){
        var i, tabcontent, tablinks;
        var tabname = $(this)[0].id;
        tabcontent = document.getElementsByClassName("tabcontent");
        for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }

        tablinks = document.getElementsByClassName("navTabItem");
        for (i = 0; i < tablinks.length; i++) {
            tablinks[i].className = tablinks[i].className.replace(" active", "");
        }

        document.getElementById('Tab'+tabname).style.display = "block";        
    });

    $('.tree li:has(ul)').addClass('parent_li').find(' > span').attr('title', 'Click para expandir');
    $('.tree li.parent_li > span i').on('click', function (e) {
        var children = $(this).parent().parent('li.parent_li').find(' > ul > li');
        if (children.is(":visible")) {
            children.hide('fast');
            $(this).attr('title', 'Click para expandir').addClass('fa-plus').removeClass('fa-minus');
        } else {
            children.show('fast');
            $(this).attr('title', 'Click para contraer').addClass('fa-minus').removeClass('fa-plus');
        }
        e.stopPropagation();
    });

    $('input[type="range"]').change(function () {
    var val = ($(this).val() - $(this).attr('min')) / ($(this).attr('max') - $(this).attr('min'));
    
    $(this).css('background-image',
                '-webkit-gradient(linear, left top, right top, '
                + 'color-stop(' + val + ', #E57500), '
                + 'color-stop(' + val + ', #C5C5C5)'
                + ')'
                );
    });

    $('.menuIngresar').click(function(){
        $(".loginContainer").is(":visible")?$(".loginContainer").hide('fast'):$(".loginContainer").show('fast');
    });  

    $('.show_menu_btn').click(function(){
        $(".vertical-menu").is(":visible")?$(".vertical-menu").hide('fast'):$(".vertical-menu").show('fast');
    });

     $('.show_menu_btn_user').click(function(){
        $(".vertical-menu-user").is(":visible")?$(".vertical-menu-user").hide('fast'):$(".vertical-menu-user").show('fast');
    });

  });
  




