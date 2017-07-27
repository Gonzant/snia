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
    "dojo/text!./templates/Contenidos2Widget.html",
    "dojo/text!./templates/estilo2017/Contenidos2Widget.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/text!config/mapa.json",
    "dojo/dom-class", "dojo/dom-style",
    "dijit/focus",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/a11yclick",
    "modulos/TOC",
    "dijit/Tooltip",				
    "esri/layers/DynamicMapServiceLayer",
    "esri/tasks/Geoprocessor",
    "dojo/dom-construct",
    "dojox/widget/Standby",
    "dojo/Deferred",
    "esri/IdentityManager",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dojo/fx",
    "dojox/layout/ScrollPane",
    "dojo/domReady!"
], function (on,
    Evented, declare, lang, arrayUtil, template, newTemplate, i18n, mapaConfigJSON, domClass, domStyle, focusUtil,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, a11yclick, TOC, Tooltip,
    DynamicMapServiceLayer, Geoprocessor, domConstruct, Standby, Deferred, esriId) {

    //"use strict";
    var widget = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
        templateString: template,
        options : {
            theme : "sitWidget",
            mapa : null,
            visible : true,
            active: false,
            config: {
                "urlDescargarCapas": "http://web.renare.gub.uy/arcgis/rest/services/SNIA/descargarCapas/GPServer/DescargarCapas"
            }
        },
        constructor: function (options, srcRefNode) {
            //mezclar opciones usuario y default
            var defaults = lang.mixin({}, this.options, options);
            //nodo del widget
            this.domNode = srcRefNode;
            this._i18n = i18n;
            this._toc = [];
            //propiedades
            this.set("mapa", defaults.mapa);
            this.set("mapaConfigJSON", mapaConfigJSON);
            this.set("theme", defaults.theme);
            this.set("visible", defaults.visible);
            this.set("config", defaults.config);
            this.set("estilo", defaults.estilo);
            this.set("active", defaults.active);
            this.set("botonAgregarCapaVisible", defaults.config.botonAgregarCapa);
            //listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            this.watch("active", this._active);
            this._urlQuery = defaults.config.urlDescargarCapas;
            if (!this._urlQuery) {
                this._urlQuery = "http://web.renare.gub.uy/arcgis/rest/services/SNIA/descargarCapas/GPServer/DescargarCapas";
            }
            if (this.estilo){
                this.set("templateString", newTemplate);
            }
            // classes
            this._css = {
                //baseClassRadioButton: "sniaRadioButton"
            };
        },
        postCreate: function () {
            this.inherited(arguments);
            if (this.mapa) {
                this._crearTOC();
            }
            this.own(
                on(this._colapsarNode, a11yclick, lang.hitch(this, this._colapsarClick)),
                on(this._expandirNode, a11yclick, lang.hitch(this, this._expandirClick)),
                on(this._agregarCapaNode, a11yclick, lang.hitch(this, this._agregarCapaClick)),
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
			new Tooltip({
                connectId: this._colapsarNode.domNode,
                label: "Comprimir contenido",
                position: ['below']
            });
            new Tooltip({
                connectId: this._expandirNode.domNode,
                label: "Expandir contenido",
                position: ['below']
            });
            new Tooltip({
                connectId: this._descargarCapas.domNode,
                label: "Descargar",
                position:['below']
            }); 			 
            this._resultadoNodeContenidos.innerHTML = "";
            this._visible();
            this.set("loaded", true);
            this.emit("load", {});
            on(esriId, "dialog-cancel", lang.hitch(this, this._behaviourSignInDialog)); 
            this._gpDescargarCapas = new Geoprocessor(this._urlQuery);
            this._active();
            this._standbyAreas = new Standby({target: this._standBy});
            domConstruct.place(this._standbyAreas.domNode, this._standBy, "after");
            this._standbyAreas.startup();
            if (this.botonAgregarCapaVisible) {
                domStyle.set(this._bAgregarCapa, 'display', 'block');
            }
        },
        _updateThemeWatch: function (attr, oldVal, newVal) {
            if (this.get("loaded")) {
                domClass.remove(this.domNode, oldVal);
                domClass.add(this.domNode, newVal);
            }
        },
        _crearTOC: function () {
            this._toc = new TOC({
                mapa: this.mapa,
                mapaConfigJSON: this.mapaConfigJSON
            }, this.tocDiv);
            this._toc.startup();
        },
        _active: function () {
            this.emit("active-changed", {});
            // Quitar foco de boton por defecto al activar el widget
            var fHandler = focusUtil.watch("curNode", function () {
                    focusUtil.curNode && focusUtil.curNode.blur(); //Quitar foco
                    fHandler.unwatch(); //Desactivar handler
                });
        },
        _colapsarClick: function () {
            this._toc.colapsarClick();
        },
        _expandirClick: function () {
            this._toc.expandirClick();
        },
        _agregarCapaClick: function () {
            var dataLayer = {
                url: this._urlCapa.value, //"http://web.renare.gub.uy/arcgis/rest/services/Inundacion/Vulnerabilidad/MapServer",
                wms: (this._formatoCapa.value === "WMS"),
                imageService: (this._formatoCapa.value === "ArcGISImageMap"),
                options: {
                        id: this._nombreCapa.value || "undefined",
                        opacity: 0.7,
                        visible: false
                    }
                };
            this._toc.agregarCapa(dataLayer);
        },
        _descargarClick: function () {
            var capasUrl, cantCapas, primero, capasNombre, parametros, capasArray, nombresArray, token;
            capasUrl = "";
            capasNombre = "";
            token = "";
            cantCapas = 0;
            primero = true;
            arrayUtil.forEach(this.mapa.mapLayers, lang.hitch(this, function (layer) {
                if (layer instanceof DynamicMapServiceLayer) {
                    if (layer.visible) {
                        cantCapas = layer.visibleLayers.length;
                        if ((cantCapas > 0) && (layer.visibleLayers[0] !== -1)) {
                            dojo.forEach(layer.visibleLayers, function (entry) {
                                if (primero) {
                                    primero = false;
                                    capasUrl = layer.url + "/" + entry;
                                    capasNombre = layer.layerInfos[entry].name;
                                    capasNombre = capasNombre.replace(/[\. ,:-]+/g, "-");

                                } else {
                                    capasUrl += ";" + layer.url + "/" + entry;
                                    capasNombre += ";" + layer.layerInfos[entry].name;
                                    capasNombre = capasNombre.replace(/[\. ,:-]+/g, "-");
                                }
                            });
                            capasNombre = capasNombre.replace("\"", '');
                        }
                    }
                }
            }));
            capasArray = [capasUrl];
            nombresArray = [capasNombre];
            if (esriId.credentials.length) {
                token = esriId.credentials[0].token;
            }
            parametros = {
                ServicioCapas : capasArray,
                Coordenadas : "",
                NombreCapas : nombresArray,
                Token : token
            };
            if (capasUrl) {
                this._resultadoNodeContenidos.innerHTML = "Descargando capas..";
                this._gpDescargarCapas.submitJob(parametros, lang.hitch(this, this._gpDescargarCapasComplete), lang.hitch(this, this._gpCheckJob));
                this._standbyAreas.show();
            }
        },
        /***********Descarga y apertura de zip**************/
        _gpDescargarCapasComplete: function (jobInfo) {
            // Es llamado cuando se termino la descarga de capas, llama a _gpCroquisResultResultadoDataCallBack
            // Con esto se obtiene el resultado del geoproceso, si esta ok se obtiene el zip
            // En caso de error _gpCroquisResultZipDataErr

            this._jobInfo = jobInfo;
            this._gpDescargarCapas.getResultData(jobInfo.jobId, "resultado", lang.hitch(this, this._gpCroquisResultResultadoDataCallBack), lang.hitch(this, this._gpCroquisResultZipDataErr));
        },
        _gpCroquisResultResultadoDataCallBack: function (value) {
            // Si no hay error llamo a _gpCroquisResultZipDataCallBack que abre el zip, si este falla llama tambien a _gpCroquisResultZipDataErr
            // Si hay error llamo a _gpCroquisResultDataErr para mostrarlo en pantalla
            this._resultadoNodeContenidos.innerHTML = "";
            this._standbyAreas.hide();
            if (value.value.Error === 1) {
                lang.hitch(this, this._gpCroquisResultDataErr(value.value.ErrorDescripcion));
            } else {
                this._gpDescargarCapas.getResultData(this._jobInfo.jobId, "zip", lang.hitch(this, this._gpCroquisResultZipDataCallBack), lang.hitch(this, this._gpCroquisResultZipDataErr));
            }
        },
        _gpCroquisResultZipDataCallBack: function (value) {
            // Abre el archivo descargado
            this._resultadoNodeContenidos.innerHTML = "";
            this._standbyAreas.hide();
            window.open(value.value.url);
        },
        _gpCroquisResultZipDataErr: function (value) {
            // Mensaje de error si falla la consulta de "zip" o de "resultado"
            function asyncProcess() {
                var deferred = new Deferred();
                setTimeout(function () {
                    deferred.resolve("success");
                }, 10000);
                return deferred.promise;
            }
            this._process  = asyncProcess();
            this._process.then(lang.hitch(this, function () {
                this._resultadoNodeContenidos.innerHTML = "";
            }));
            this._resultadoNodeContenidos.innerHTML = value;
            this._standbyAreas.hide();
        },
        _gpCroquisResultDataErr: function (value) {
            // Muestra el mensaje de error que vino en resultado
            function asyncProcess() {
                var deferred = new Deferred();
                setTimeout(function () {
                    deferred.resolve("success");
                }, 4000);
                return deferred.promise;
            }
            this._process  = asyncProcess();
            this._process.then(lang.hitch(this, function () {
                this._resultadoNodeContenidos.innerHTML = "";
                this._gpDescargarCapas.getResultData(this._jobInfo.jobId, "zip", lang.hitch(this, this._gpCroquisResultZipDataCallBack), lang.hitch(this, this._gpCroquisResultZipDataErr));
            }));
            this._resultadoNodeContenidos.innerHTML = value;
            this._standbyAreas.hide();
        },
        /***********Chequeo de status**************/
        _gpCheckJob: function (jobInfo) {
            // Es llamado para verificar el porcentaje de descargas
            var msg;
            if (jobInfo.messages.length > 0) {
                msg = jobInfo.messages[jobInfo.messages.length - 1];
                if ((msg.description[0] !== "R") && (msg.description[0] !== "{")) {
                    this._resultadoNodeContenidos.innerHTML = msg.description;
                }
            }
        },
        _asyncProcess: function () {
            var deferred = new Deferred();
            setTimeout(function () {
                deferred.resolve("success");
            }, 2000);
            return deferred.promise;
        },
        
        _behaviourSignInDialog: function(){           
           dojo.query(".esriSignInDialog").empty();
           dojo.query(".esriSignInDialog")[0].remove();
        }
    });
    return widget;
});