/*
 * js/snia/widgets/ContenidosWidget
 * 
 */
/*global define, console*/
/*jslint nomen: true */

define([
    "dojo/on",
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/text!./templates/ContenidosWidget.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/dom-class", "dojo/dom-style",
    "dijit/focus",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/a11yclick",
    "agsjs/dijit/TOC",
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "esri/tasks/Geoprocessor",
    "dojo/dom-construct",
    "dojox/widget/Standby",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dojo/fx",
    "dojo/domReady!",
    "dojox/layout/ScrollPane"
], function (on,
    Evented, declare, lang, arrayUtil, template, i18n, domClass, domStyle,
    focusUtil, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, a11yclick, TOC, ArcGISDynamicMapServiceLayer, Geoprocessor, domConstruct, Standby ) {

    //"use strict";
    var widget = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
        templateString: template,
        options : {
            theme : "sitWidget",
            mapa : null,
            visible : true,
            active: false,
            config: {}
        },
        constructor: function (options, srcRefNode) {
            //mezclar opciones usuario y default
            var defaults = lang.mixin({}, this.options, options);
            //nodo del widget
            this.domNode = srcRefNode;
            this._i18n = i18n;
            this._dynamicMapServiceLayers = [];
            this._toc = [];
            //propiedades
            this.set("mapa", defaults.mapa);
            this.set("theme", defaults.theme);
            this.set("visible", defaults.visible);
            this.set("config", defaults.config);
            this.set("active", defaults.active);
            //listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            this.watch("active", this._active);
            // classes
            this._css = {
                //baseClassRadioButton: "sniaRadioButton"
            };
        },
        postCreate: function () {
            this.inherited(arguments);
            if (this.mapa) {
                if (this.config.dynamicMapServiceLayers) {
                    this._dynamicMapServiceLayers = this.config.dynamicMapServiceLayers;
                }
                this._loadDynamicMapServiceLayers();
            }
                this.own(
                    on(this._colapsarNode, a11yclick, lang.hitch(this, this._colapsarClick)),
                    on(this._expandirNode, a11yclick, lang.hitch(this, this._expandirClick)),
                    on(this._descargarCapas, a11yclick, lang.hitch(this, this._descargarClick))
                );

        },
        // start widget. called by user
        startup: function () {
            // mapa no definido
            if (!this.mapa) {
                this.destroy();
                console.log('ContenidosWidget::requiere un mapa');
            }
            //  mapa cargado
            if (this.mapa.loaded) {
                this._init();
            } else {
                on.once(this.mapa, "load", lang.hitch(this, function () {
                    this._init();
                }));
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
            this.set("loaded", true);
            this.emit("load", {});
            this._gpDescargarCapas = new Geoprocessor("http://web.renare.gub.uy/arcgis/rest/services/SNIA/descargarCapas/GPServer/DescargarCapas");
            this._active();
            this._standbyAreas = new Standby({target: this._contenidosParentNode});
            domConstruct.place(this._standbyAreas.domNode, this._contenidosParentNode, "after");
            this._standbyAreas.startup();
        },
        _updateThemeWatch: function (attr, oldVal, newVal) {
            if (this.get("loaded")) {
                domClass.remove(this.domNode, oldVal);
                domClass.add(this.domNode, newVal);
            }
        },
        _loadDynamicMapServiceLayers: function () {
            var dynaLayersInfo;
            dynaLayersInfo = [];
            arrayUtil.forEach(this.mapa.map.layerIds, lang.hitch(this, function (item, index) {
                var l;
                l  = this.mapa.map.getLayer(item);
                if (index > 0) {//0 es mapa base
                    dynaLayersInfo.push({layer: l, title: l.id, collapsed: true, slider: true});
                }
            }));
            dynaLayersInfo.reverse(); //Mostrar las capas en el orden de la configuracion
            this._toc = new TOC({
                map: this.mapa.map,
                style: "inline",
                layerInfos: dynaLayersInfo
            }, this.tocDiv);
            this._toc.startup();
        },
        _active: function () {
            this.emit("active-changed", {});
            // Quitar foco de boton por defecto al activar el widget
            var fHandler = focusUtil.watch("curNode", function(){
                 focusUtil.curNode && focusUtil.curNode.blur(); //Quitar foco
                 fHandler.unwatch(); //Desactivar handler
           });
        },
        _colapsarClick: function () {
            arrayUtil.forEach(this._toc._rootLayerTOCs, lang.hitch(this, function (item) {
                item._rootLayerNode.collapse();
            }));
        },
        _expandirClick: function () {
            arrayUtil.forEach(this._toc._rootLayerTOCs, lang.hitch(this, function (item) {
                item._rootLayerNode.expand();
            }));
        },
        _descargarClick: function () {
            var capasUrl, cantCapas, primero, capasNombre, parametros, capasArray, nombresArray ;
            capasUrl = "";
            capasNombre = "";
            cantCapas = 0;
            primero = true;
            arrayUtil.forEach(this.mapa.mapLayers, lang.hitch(this, function (layer) {
                if (layer instanceof ArcGISDynamicMapServiceLayer) {
                    if (layer.visible) {
                        cantCapas = layer.visibleLayers.length;
                        dojo.forEach(layer.visibleLayers, function (entry) {
                            if (primero) {
                                primero = false;
                                capasUrl = layer.url + "/" + entry;
                                capasNombre = layer.layerInfos[entry].name;

                            } else {
                                capasUrl += ";" + layer.url + "/" + entry;
                                capasNombre += ";" + layer.layerInfos[entry].name;
                            }
                        });
                        capasNombre = capasNombre.replace("\"", '');
                    }
                }
            }));
            console.log(capasUrl);
            console.log(capasNombre);
            capasArray = [capasUrl];
            nombresArray = [capasNombre];
            parametros = {
                ServicioCapas : capasArray,
                Coordenadas : "",
                NombreCapas : nombresArray
            };
            if (capasUrl) {
                this._gpDescargarCapas.submitJob(parametros, lang.hitch(this, this._gpDescargarCapasComplete));
                this._standbyAreas.show();
            }
        },
        _expandirSeleccionadosClick: function () {
            arrayUtil.forEach(this._toc._rootLayerTOCs, lang.hitch(this, function (item) {
                if (item._rootLayerNode.data.visible === true) {
                    item._rootLayerNode.expand();
                }
            }));
        },
        _gpDescargarCapasComplete: function (jobInfo) {
//            this._standbyAreas.show();
            console.log("_gpDescargarCapasComplete");
            this._gpDescargarCapas.getResultData(jobInfo.jobId, "zip", lang.hitch(this, this._gpCroquisResultDataCallBack), lang.hitch(this, this._gpCroquisResultDataErr));
        },
        _gpCroquisResultDataCallBack: function (value) {
            this._standbyAreas.hide();
            window.open(value.value.url);
            console.log("llego");
        },
        _gpCroquisResultDataErr: function (value) {
            console.log("error",value);
            this._standbyAreas.hide();
        }
    });
    return widget;
});
