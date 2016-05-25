/*
 * js/snia/widgets/TiempoWidget
 * 
 */
/*global define, console*/
/*jslint nomen: true */
define([
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/TiempoWidget.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/_base/array",
    "dojo/on",
    "esri/TimeExtent",
    "esri/dijit/TimeSlider",
    "dojo/dom-attr"
], function (Evented, declare, lang, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    template, i18n, domClass, domStyle, arrayUtil, on,
    TimeExtent, TimeSlider, domAttr) {
    //"use strict";
    var widget = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
        templateString: template,
        isLayoutContainer: false,
        options : {
            theme : "sitWidget",
            mapa : null,
            visible : true,
            active: false
        },
        constructor: function (options, srcRefNode) {
            //mezclar opciones usuario y default
            var defaults = lang.mixin({}, this.options, options);
            //nodo del widget
            this.domNode = srcRefNode;
            this._i18n = i18n;
            //propiedades
            this.set("mapa", defaults.mapa);
            this.set("theme", defaults.theme);
            this.set("visible", defaults.visible);
            this.set("active", defaults.active);
            this.set("_fechaAtributo", defaults.config.fechaAtributo);
            this.set("_urlQuery", defaults.config.urlQuery);
            this.set("_timeSlider", defaults.config.timeSlider);
            //listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            this.watch("active", this._activar);
            this.watch("reload", this._reload);
            // classes
            this._css = {
               // baseClassRadioButton: "sniaRadioButton"
            };
            this._primero = true;
            this._resetOnClose = false;
        },
        _activar: function () {
            this.emit("active-changed");
            if (this.get("active")) {
                this._resetOnClose = false;
                this._reconstruirTimeSlider();
            } else {
                if (this.timeSlider.playing) {
                    this.timeSlider.pause();
                }
                this._resetOnClose = true;
                this.timeSlider.setThumbIndexes([0, this.timeSlider._numTicks - 1]);
            }
        },
        _reload: function () {
            this._reconstruirTimeSlider();
        },
        postCreate: function () {
            this.inherited(arguments);
            if (this.mapa) {
                this.own(
                    //on(this.mapa, "reload", this._reload)
                );
            }
        },
        // start widget. called by user
        startup: function () {
            if (!this.loaded) {
                // mapa no definido
                if (!this.mapa) {
                    this.destroy();
                    console.log('TiempoWidget::requiere un mapa');
                }
                //  mapa cargado
                if (this.mapa.loaded) {
                    this._init();
                } else {
                    on.once(this.mapa, "load", lang.hitch(this, function () {
                        this._init();
                    }));
                }
            }
        },
        // connections/subscriptions se limpian durante la fase destroy()
        destroy: function () {
            this.inherited(arguments);
        },
        /* ---------------- */
        /* Eventos Publicos */
        /* ---------------- */
        // load
        /* ---------------- */
        /* Funciones publicas */
        /* ---------------- */
        show: function () {
            this.set("visible", true);
        },
        hide: function () {
            this.set("visible", false);
        },
        /* ---------------- */
        /* Funciones Privadas */
        /* ---------------- */
        _visible: function () {
            if (this.get("visible")) {
                domStyle.set(this.domNode, 'display', 'block');
            } else {
                domStyle.set(this.domNode, 'display', 'none');
            }
        },
        _init: function () {
            this._visible();
            //this._activar();
            this.set("loaded", true);
            this.emit("load", {});
            on(this.mapa, "reload", lang.hitch(this, this._reload));
            this._getDates();
        },
        _reconstruirTimeSlider: function () {
            this.mapa.map.setTimeSlider(this.timeSlider);
            if (this.get("active")) {
                this.timeSlider.setThumbIndexes(this._intervaloTiempo);
            } else {
                this.timeSlider.setThumbIndexes([0, this.timeSlider._numTicks - 1]);
            }
        },
        _updateThemeWatch: function (attr, oldVal, newVal) {
            if (this.get("loaded")) {
                domClass.remove(this.domNode, oldVal);
                domClass.add(this.domNode, newVal);
            }
        },
        _getDates: function () {
            var min, max;
            arrayUtil.forEach(this.mapa.map.layerIds, lang.hitch(this, function (item, index) {
                var l, primero;
                primero = true;
                l  = this.mapa.map.getLayer(item);

                if (l.hasOwnProperty("timeInfo")) {
                    if (primero) {
                        min = l.timeInfo.timeExtent.startTime;
                        max = l.timeInfo.timeExtent.endTime;
                    } else {
                        if (l.timeInfo.timeExtent.startTime < min) {
                            min = l.timeInfo.timeExtent.startTime;
                        }
                        if (l.timeInfo.timeExtent.endTime > max) {
                            max = l.timeInfo.timeExtent.endTime;
                        }
                    }
                }
            }));
            this._sTime = min;
            this._eTime = max;
            this._initSlider();
        },
//        _queryTaskCallbackCombo: function(result){   
//            console.log(result);
//            this._sTime = result.features[0].attributes.acq;
//            this._eTime = result.features[result.features.length-1].attributes.acq;
//            this._initSlider();
//        },
//        _queryTaskErrbackCombo: function(){
//            console.log("Error");
//        },
        _initSlider: function () {
            var timeExtent, labels;
            this.timeSlider = new TimeSlider({
                style: "width: 100%"
            });
            this._tiempoNode.appendChild(this.timeSlider.domNode);
            this.mapa.map.setTimeSlider(this.timeSlider);
            timeExtent = new TimeExtent();
            timeExtent.startTime = new Date(this._sTime + " UTC");
            timeExtent.endTime = new Date(this._eTime + " UTC");
            domAttr.set(this._tiempoTexto, "innerHTML", "<i>" + timeExtent.startTime.getUTCDate() + "/" + (timeExtent.startTime.getUTCMonth() + 1) + "/" + timeExtent.startTime.getUTCFullYear() + "-" + timeExtent.endTime.getUTCDate() + "/" + (timeExtent.endTime.getUTCMonth() + 1) + "/" + timeExtent.endTime.getUTCFullYear() + "<\/i>");
            domStyle.set(this._tiempoTexto, 'text-align', 'center');
            this.timeSlider.setThumbCount(2);
            this.timeSlider.createTimeStopsByTimeInterval(timeExtent, this._timeSlider.cantidad, this._timeSlider.unidad);
            this.timeSlider.setThumbIndexes([0, this.timeSlider._numTicks - 1]);
            this._intervaloTiempo = this.timeSlider.thumbIndexes;
            this.timeSlider.setThumbMovingRate(this._timeSlider.velocidad);
            this.timeSlider.startup();
            //add labels for every other time stop
            labels = arrayUtil.map(this.timeSlider.timeStops, lang.hitch(this, function (timeStop, i) {
                if (i === 0) {
                    return timeStop.getUTCDate() + "/" + (timeStop.getUTCMonth() + 1) + "/" + timeStop.getUTCFullYear();
                }
                if (i === this.timeSlider._numTicks - 1) {
                    return timeStop.getUTCDate() + "/" + (timeStop.getUTCMonth() + 1) + "/" + timeStop.getUTCFullYear();
                }
                return "";
            }));
            this.timeSlider.setLabels(labels);
            this.timeSlider.on("time-extent-change", lang.hitch(this, this._timeChange));
        },
        _timeChange: function (evt) {
            var startValString, endValString;
            startValString = evt.startTime.getUTCDate() + "/" + (evt.startTime.getUTCMonth() + 1) + "/" + evt.startTime.getUTCFullYear();
            endValString = evt.endTime.getUTCDate() + "/" + (evt.endTime.getUTCMonth() + 1) + "/" + evt.endTime.getUTCFullYear();
            domAttr.set(this._tiempoTexto, "innerHTML", "<i>" + startValString + "-" + endValString  + "<\/i>");
            if (!this._resetOnClose) {
                this._intervaloTiempo = this.timeSlider.thumbIndexes;
            }
        }
    });
    return widget;
});