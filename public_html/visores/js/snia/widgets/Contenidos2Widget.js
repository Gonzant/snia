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
    "dojo/i18n!./nls/snianls.js",
    "dojo/text!config/mapa.json",
    "dojo/dom-class", "dojo/dom-style", "dojo/dom-construct", "esri/request", "esri/config", "dojo/request/xhr",
    "dijit/focus",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/a11yclick",
    "dojo/store/Memory",
    "dijit/Tree",
    "dijit/tree/ObjectStoreModel",
    "esri/geometry/scaleUtils",
    "esri/tasks/Geoprocessor",
    "dojox/widget/Standby",
    "dojo/Deferred",
    "esri/IdentityManager",
    "dijit/Tooltip",
    "dijit/form/HorizontalSlider",
    "dijit/form/CheckBox",
    "dojox/xml/parser",
    "dojox/data/XmlStore",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dojo/fx",
    "dojo/domReady!",
    "dojox/layout/ScrollPane"
], function (on,
    Evented, declare, lang, arrayUtil, template, i18n, mapaConfigJSON,
    domClass, domStyle, domConstruct, esriRequest, esriConfig, xhr,
    focusUtil, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, a11yclick,
    Memory, Tree, ObjectStoreModel, scaleUtils, Geoprocessor, Standby, Deferred, esriId, Tooltip,
    HorizontalSlider, CheckBox, Parser, XmlStore) {

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
            this._dynamicMapServiceLayers = [];
            this._toc = [];
            this._data = [];
            this._tree = false;
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
            on(this.mapa, 'reload', lang.hitch(this, function () {
               on(this.mapa.map, 'update-end', lang.hitch(this, this._adjustVisibility));
            }));
            this._urlQuery = defaults.config.urlDescargarCapas;
            if (!this._urlQuery) {
                this._urlQuery = "http://web.renare.gub.uy/arcgis/rest/services/SNIA/descargarCapas/GPServer/DescargarCapas";
            }
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
                this._generarData(mapaConfigJSON, this.mapa.map);
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
            this._resultadoNodeContenidos.innerHTML = "";
            this.crearArbol();
            this._visible();
            this.set("loaded", true);
            this.emit("load", {});
            this._gpDescargarCapas = new Geoprocessor(this._urlQuery);
            this._active();
            this._standbyAreas = new Standby({target: this._standBy});
            domConstruct.place(this._standbyAreas.domNode, this._standBy, "after");
            this._standbyAreas.startup();
        },
        _updateThemeWatch: function (attr, oldVal, newVal) {
            if (this.get("loaded")) {
                domClass.remove(this.domNode, oldVal);
                domClass.add(this.domNode, newVal);
            }
        },
        _active: function () {
            this.emit("active-changed", {});
            // Quitar foco de boton por defecto al activar el widget
            var fHandler = focusUtil.watch("curNode", function () {
                focusUtil.curNode && focusUtil.curNode.blur(); //Quitar foco
                fHandler.unwatch(); //Desactivar handler
            });
        },
        refreshTree : function () {
            if (this._tree) {
                this._tree.dndController.selectNone(); // As per the answer below     
                // Credit to this discussion: http://mail.dojotoolkit.org/pipermail/dojo-interest/2010-April/045180.html
                // Close the store (So that the store will do a new fetch()).
                this._tree.model.store.clearOnClose = true;
               // this._tree.model.store.close();

                // Completely delete every node from the dijit.Tree     
                this._tree._itemNodesMap = {};
                this._tree.rootNode.state = "UNCHECKED";
                this._tree.model.root.children = null;

                // Destroy the widget
                this._tree.rootNode.destroyRecursive();

                // Recreate the model, (with the model again)
                this._tree.model.constructor(this._tree.model);

                // Rebuild the tree
                this._tree.postMixInProperties();
                this._tree._load();
            }
        },
        _colapsarClick: function () {
            this._tree.collapseAll();
        },
        _expandirClick: function () {
            //Expando todos los hijos de root para no abrir las leyendas
            var nodes = this._tree.rootNode.getChildren();
            arrayUtil.forEach(nodes, function (node) {
                this._tree._expandNode(node);
            }, this);
        },
        _getLegendJSON:    function (url) {
            var requestHandle = esriRequest({
                "url": url,
                "content": {
                    "f": "pjson"
                },
                "callbackParamName": "callback"
            });
            requestHandle.then(lang.hitch(this, this._requestSucceededLegendJSON), this._requestFailed);
        },
        /*_getLegendWMS: function (url) {
            var requestHandle = esriRequest({
                "url": url,
                "content": {
                    "f": "pjson"
                },
                "callbackParamName": "callback"
            });
            requestHandle.then(lang.hitch(this, this._requestSucceededLegendWMS), this._requestFailed);         
        },*/
        /*_getWMSInfo: function (url) {
             //FIXME
        },*/
        _requestSucceededLegendJSON: function (response) {
            var tocNode;
            arrayUtil.forEach(response.layers, function (layer) {
                tocNode = arrayUtil.filter(this._data, function (item) {
                    return item.id === layer.layerName;
                });
                if (tocNode.length > 0) { //Si la capa está incluida en la tabla de contenidos
                    if (layer.legend.length === 1 && layer.legend[0].label === "") { // una hoja
                        tocNode[0].imageData =  layer.legend[0].imageData;
                        tocNode[0].contentType = layer.legend[0].contentType;
                    } else { // multiples hojas
                        arrayUtil.forEach(layer.legend, function (layerLegend) {
                            this._data.push({ id: layerLegend.label, name: layerLegend.label, legend: true, parent:  layer.layerName, imageData:  layerLegend.imageData, contentType: layerLegend.contentType });
                        }, this);
                    }
                }
            }, this);
        },
        /*_requestSucceededLegendWMS: function (response) {
            var tocNode;
            arrayUtil.forEach(response.layers, function (layer) {
                tocNode = arrayUtil.filter(this._data, function (item) {
                    return item.id === layer.layerName;
                });
                if (tocNode.length > 0) { //Si la capa está incluida en la tabla de contenidos
                    if (layer.legend.length === 1 && layer.legend[0].label === "") { // una hoja
                        tocNode[0].imageData =  layer.legend[0].imageData;
                        tocNode[0].contentType = layer.legend[0].contentType;
                    } else { // multiples hojas
                        arrayUtil.forEach(layer.legend, function (layerLegend) {
                            this._data.push({ id: layerLegend.label, name: layerLegend.label, legend: true, parent:  layer.layerName, imageData:  layerLegend.imageData, contentType: layerLegend.contentType });
                        }, this);
                    }
                }
            }, this);
        },*/
        _requestFailed: function () {
        },
        _adjustVisibility: function (item) {
        //FIXME: agregar soporte a segundo nivel capas WMS
            var scale = parseInt(scaleUtils.getScale(this.mapa.map)),
                nodes = this._tree.rootNode.getChildren(),
                layers, l;
            arrayUtil.forEach(nodes, function (node) {
                if (!item || !item.id || (item.id && node.item.id === item.id)) {
                    var nodeOutScale;
                    if (node.item.wms) {
                        l = this.mapa.map.getLayer(node.item.id);
                        nodeOutScale = !l.visibleAtMapScale;
                    } else {
                        nodeOutScale = (node.item.maxScale !== 0 && scale < node.item.maxScale) || (node.item.minScale !== 0 && scale > node.item.minScale);
                    }
                    if (nodeOutScale) {
                        domClass.add(node.domNode, 'TOCOutOfScale');
                    } else {
                        domClass.remove(node.domNode, 'TOCOutOfScale');
                        if (node.hasChildren()) {
                            layers = node.getChildren();
                            arrayUtil.forEach(layers, function (layer) {
                                var layerOutScale = (layer.item.maxScale !== 0 && scale < layer.item.maxScale) || (layer.item.minScale !== 0 && scale > layer.item.minScale);
                                if (layerOutScale) {
                                    domClass.add(layer.domNode, 'TOCOutOfScale');
                                } else {
                                    domClass.remove(layer.domNode, 'TOCOutOfScale');
                                }
                            });
                        }
                    }
                }
            }, this);
        },
        _generarNodoSimple: function (l, dataLayer) {
            var sublayerTooltip;
             this._data.push({ id: dataLayer.options.id, name: dataLayer.options.id, wms: dataLayer.wms, tooltip: dataLayer.tooltip || "", type: 'mapservice', maxScale: l.maxScale, minScale: l.minScale, parent: 'root', opacity: dataLayer.options.opacity });
            //Procesar subcapas
            if (dataLayer.wms) { // Si es WMS
                arrayUtil.forEach(l.layerInfos, function (li) {
                    if (dataLayer.sublayersTooltips) {
                        sublayerTooltip = dataLayer.sublayersTooltips[li.title] || "";
                    } else {
                        sublayerTooltip = "";
                    }

                    ////this._getWMSInfo(dataLayer.url);
                    this._data.push({ id: li.title, name: li.title, index: li.name, tooltip: sublayerTooltip, type: 'layer', maxScale: li.maxScale || 0, minScale: li.minScale || 0, parent:  dataLayer.options.id });
                    this._data.push({ id: "prueba", name: li.name, type: 'layer', parent:  li.title, legend: true, legendURL: li.legendURL });
                    //this._getLegendWMS(li.legendURL);
                }, this);
            } else {
                this._getLegendJSON(dataLayer.url + "/legend");
                arrayUtil.forEach(l.layerInfos, function (li) {
                    if (dataLayer.sublayersTooltips) {
                        sublayerTooltip = dataLayer.sublayersTooltips[li.name] || "";
                    } else {
                        sublayerTooltip = "";
                    }
                    if (!dataLayer.layers || arrayUtil.indexOf(dataLayer.layers, li.id) >= 0) {
                        this._data.push({ id: li.name, name: li.name, index: li.id, tooltip: sublayerTooltip, type: 'layer', maxScale: li.maxScale, minScale: li.minScale, parent:  dataLayer.options.id });
                    }
                }, this);                            
            }
            this.refreshTree();

        },
        _generarNodoMultiple: function (dataLayer, map){
            this._data.push({ id: dataLayer.options.id, name: dataLayer.options.id, tooltip: dataLayer.tooltip || "", type: 'multiple', multiple: dataLayer.multiple, parent: 'root', opacity: dataLayer.options.opacity });
            arrayUtil.forEach(dataLayer.multiple, function (dataLayer1) {
               this._getLegendJSON(dataLayer1.url + "/legend"); //Traigo todo
               l = map.getLayer(dataLayer.options.id + dataLayer1.url);
               if (l !== null){
                   arrayUtil.forEach(l.layerInfos, function (li) {
                       if (!dataLayer1.layers || arrayUtil.indexOf(dataLayer1.layers, li.id) >= 0) {
                           this._data.push({ id: li.name, name: li.name, maxScale: li.maxScale, minScale: li.minScale, parent:  dataLayer.options.id, vparent: l.id });
                       }
                   }, this);
               }
           }, this);           
        },
        _generarData: function (mapaConfigJSON, map) {
            var mapaConfig, dynLayers, l, sublayerTooltip;
            this._data = [{ id: 'root'}];
            mapaConfig = JSON.parse(mapaConfigJSON);
            dynLayers = mapaConfig.mapa.dynamicLayers;
            arrayUtil.forEach(dynLayers, function (dataLayer) {
                if (dataLayer.url) { //Nodo a partir de un map service
                    l = map.getLayer(dataLayer.options.id);
                    if (l !== null) {
                        l.on("visibility-change", lang.hitch(this, this._adjustVisibility));
                        if (l.loaded) {
                            this._generarNodoSimple(l, dataLayer);
                        } else {
                            l.on("load", lang.hitch(this, this._generarNodoSimple, l, dataLayer));
                        }
                    }
                } else if (dataLayer.multiple) { //Nodo a partir de varios map services
                    this._generarNodoMultiple(dataLayer, map);
                }
            }, this);
        },
        _onItemClick: function (item, node) {
            var isNodeSelected = node.checkBox.get('checked'), l, visibleLayers, i, name;
            if (item.parent === "root") { //Si es un map service
                if (item.type === "multiple") {
                    arrayUtil.forEach(item.multiple, function (url) {
                        l = this.mapa.map.getLayer(item.id + url.url);
                        if (isNodeSelected) {
                            l.show();
                        } else {
                            l.hide();
                        }
                    }, this);
                } else {
                    l = this.mapa.map.getLayer(item.id);
                    if (isNodeSelected) {
                        l.show();
                    } else {
                        l.hide();
                    }
                }
            } else { //Si es una subcapa
                l = this.mapa.map.getLayer(item.vparent || item.parent);
                visibleLayers = l.visibleLayers;

                if (isNodeSelected) {
                    visibleLayers.push(item.index);
                } else {
                    visibleLayers.pop(item.index);
                }
                l.setVisibleLayers(visibleLayers);
                if (l.visible) {
                    l.show();
                }
            }
        },
        _createTreeNode: function (args) {
            var tnode = new Tree._TreeNode(args), cb, slider, l, tooltip, t;
            tnode.labelNode.innerHTML = args.label;
            if (!args.item.tooltip || args.item.tooltip === "") {
                tooltip = args.label;
            } else {
                tooltip = args.item.tooltip;
            }
            t = new Tooltip({
                connectId: [tnode.labelNode],
                label: tooltip
            });

            if (!args.item.legend) {
                cb = new CheckBox();
                cb.placeAt(tnode.labelNode, "first");
                tnode.checkBox = cb;
            }
            if (args.item.legendURL) {
                tnode.labelNode.innerHTML =  "<img src='" + args.item.legendURL + "'>";
                
            }
            if (args.item.parent === "root") { //Si está en el segundo nivel
                slider = new HorizontalSlider({
                    showButtons: false,
                    style: "width:75%;float:right;",
                   // layoutAlign: 'right',
                    value: args.item.opacity * 100,
                    onChange: lang.hitch(this, function (value) {
                        if (args.item.parent === "root") {
                            if (args.item.type === "mapservice") {//Si es un map service
                                l = this.mapa.map.getLayer(args.item.id);
                                l.setOpacity(value / 100);
                            } else { //Si es un nodo múltiple args.item.type === "multiple"
                                arrayUtil.forEach(args.item.multiple, function (dataLayer) {
                                    l = this.mapa.map.getLayer(args.item.id + dataLayer.url);
                                    l.setOpacity(value / 100);
                                }, this);
                            }
                        }
                    })
                });
                slider.placeAt(tnode.labelNode, "last");
                tnode.slider = slider;
                slider.startup();
            }
            return tnode;
        },
        crearArbol: function () {
            var myStore, myModel;
            myStore = new Memory({
                data: this._data,
                getChildren: function (object) {
                    return this.query({parent: object.id});
                }
            });
            // Crear el modelo
            myModel = new ObjectStoreModel({
                store: myStore,
                query: {id: 'root'},
                mayHaveChildren: function (item) { return myStore.query({parent: item.id}).length > 0; }
            });
            // Crear el arbol
            this._tree = new Tree({
                model: myModel,
                showRoot: false,
                onClick: lang.hitch(this, this._onItemClick),
                _createTreeNode: lang.hitch(this, this._createTreeNode),
                getIconStyle: function (item) {
                    if (item.imageData) {
                        var imgUri = "url(data:" + item.contentType  + ";base64," + item.imageData + ")";
                        return {backgroundImage: imgUri, backgroundRepeat: "no-repeat", backgroundPosition: "left center",  backgroundSize: "16px 16px"};
                    } //Si es WMS no se usa el icono
                }
            });
            this._tree.placeAt(this._treeNode);
            this._tree.startup();
            this._adjustVisibility();
            on(this._tree, 'open', lang.hitch(this,  function (item) {
                lang.hitch(this,this._adjustVisibility(item));
            }));
            on(this.mapa.map, 'update-end', lang.hitch(this, this._adjustVisibility));
        },
        _descargarClick: function () {
            var capasUrl, cantCapas, primero, capasNombre, parametros, capasArray, nombresArray, token;
            capasUrl = "";
            capasNombre = "";
            token = "";
            cantCapas = 0;
            primero = true;
            arrayUtil.forEach(this.mapa.mapLayers, lang.hitch(this, function (layer) {
                if (layer instanceof ArcGISDynamicMapServiceLayer) {
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
        }
    });
    return widget;
});


