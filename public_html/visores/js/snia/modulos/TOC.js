/*
 * js/snia/modulos/TOC
 * Tabla de Contenidos - SNIA
 */
/*global define*/
/*jslint nomen: true*/
define([
    "dojo/on",
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/dom-class", "dojo/dom-style",
    "dojo/store/Memory",
    "dijit/Tree",
    "dijit/tree/ObjectStoreModel",
    "dijit/Tooltip",
    "dijit/form/HorizontalSlider",
    "dijit/form/CheckBox",
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "esri/config",
    "esri/layers/WMSLayer",
    "esri/geometry/scaleUtils",
    "esri/tasks/Geoprocessor",
    "esri/request",
    "dojo/domReady!"
], function (on, Evented, declare, lang, arrayUtil,
     domClass, domStyle,
     Memory, Tree, ObjectStoreModel,
     Tooltip, HorizontalSlider, CheckBox, 
     ArcGISDynamicMapServiceLayer, esriConfig, WMSLayer, scaleUtils, Geoprocessor,
    esriRequest) {
    "use strict";
    var TOC = declare([Evented], {
        options : {
            mapa : null,
            mapaConfigJSON: null,
            config: {
                "proxyXML2JSON": "http://web.renare.gub.uy/arcgis/rest/services/SNIA/gpXMLToJSON/GPServer/XmlToJSON"
            }
        },
        //publico
        constructor : function (options, srcRefNode) {
            //mezclar opciones usuario y default
            var defaults = lang.mixin({}, this.options, options);
            this.domNode = srcRefNode;
            this._data = [];
            this._tree = false;
            this.mapa = defaults.mapa;
            this.mapaConfigJSON = defaults.mapaConfigJSON;
            this.proxyXML2JSON = defaults.config.proxyXML2JSON;
            on(this.mapa, 'reload', lang.hitch(this, function () {
                on(this.mapa.map, 'update-end', lang.hitch(this, this._adjustVisibility));
            }));
        },
        startup: function () {
            // mapa no definido
            if (!this.mapa) {
                this.destroy();
                console.log('TOC::requiere un mapa');
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
        //privadas
        _init: function () {
            this._generarData();
            this._crearTree();
        },
        _executeGP: function (url){
            this._gpXMLInfo = new Geoprocessor(this.proxyXML2JSON);
            this._gpURL = url;
            var params = {"UrlXMl":url};
            this._gpXMLInfo.submitJob(params, lang.hitch(this, this._completeCallback), this._statusCallback);
        },
        _statusCallback:  function (jobInfo){
            console.log(jobInfo.jobStatus);
        },
        _completeCallback: function (jobInfo) {
            this._gpXMLInfo.getResultData(jobInfo.jobId, "Resultado", lang.hitch(this, function(json){
                this._setScalesMinMax(json);
                //VER CUADERNO
                //Tengo que hacer un foreach sobre this.tree para encontrar la misma url del geoproceso
                //y agregarle scaleMax y scaleMin. 
                //Tengo que ver como hago para manejar que no sé si esto se ejecuta antes o después 
                //que el código que genera las sub capas wms 
            }));
            this.refreshTree();
        },
        _setScalesMinMax: function (json) {
          //do something with the results
          //alert(jobInfo);
            var children = this._tree.rootNode.getChildren(), r;
            arrayUtil.forEach(children, function (tl) {
                var ch = tl.getChildren(tl);
                if (tl.item.wms && tl.item.url === this._gpURL) {
                      var ch = tl.getChildren();
                      r = this._getScaleMinMaxFromJson(json);
                      arrayUtil.forEach(r, function (l, i) {
                          if (i === 0){
                                if (l.MaxScaleDenominator) tl.item.MaxScale = l.MaxScaleDenominator;
                                if (l.MinScaleDenominator) tl.item.MinScale = l.MinScaleDenominator;  
                          } else if (l.Title ===  ch[i-1].item.title){
                                if (l.MaxScaleDenominator) ch[i-1].item.MaxScale = l.MaxScaleDenominator;
                                if (l.MinScaleDenominator) ch[i-1].item.MinScale = l.MinScaleDenominator;                                
                          }
                      }, this);
                }
            }, this);
        },
        _getScaleMinMaxFromJson: function (json) {
            var layer = json.value.WMS_Capabilities.Capability.Layer, r = [], i = 1;
                r[0] = {};
                r[0].MaxScaleDenominator = layer.MaxScaleDenominator;
                r[0].MinScaleDenominator = layer.MinScaleDenominator;
                arrayUtil.forEach(layer.Layer, function (l) {
                    r[i] = {};
                    r[i].Title = l.Title;
                    r[i].Name = l.Name;
                    r[i].MaxScaleDenominator = l.MaxScaleDenominator;
                    r[i].MinScaleDenominator = l.MinScaleDenominator;
                    i++;
                });
            return r;
        },
        _crearTree: function () {
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
                    if (item.imageData) {//Arcgis
                        var imgUri = "url(data:" + item.contentType  + ";base64," + item.imageData + ")";
                        return {backgroundImage: imgUri, backgroundRepeat: "no-repeat", backgroundPosition: "left center",  backgroundSize: "16px 16px"};
                    } //Si es WMS no se usa el icono
                }
            });
            this._tree.placeAt(this.domNode);
            this._tree.startup();
            this._adjustVisibility();
            on(this._tree, 'open', lang.hitch(this,  function (item) {
                lang.hitch(this, this._adjustVisibility(item));
            }));
            on(this.mapa.map, 'update-end', lang.hitch(this, this._adjustVisibility));
        },
        _generarNodoSimple: function (l, dataLayer) {
            this._data.push({ id: dataLayer.options.id, name: dataLayer.options.id, wms: dataLayer.wms, tooltip: dataLayer.tooltip || "", type: 'mapservice', maxScale: l.maxScale, minScale: l.minScale, parent: 'root', opacity: dataLayer.options.opacity, url: dataLayer.url });
            //Procesar subcapas
            if (dataLayer.wms) { // Si es WMS
                this._generarSubcapasWMS(l, dataLayer, dataLayer.options.id, dataLayer.options.id);
            } else {
                this._generarSubcapasArcgis(l, dataLayer, dataLayer.options.id, dataLayer.options.id);
            }
            this.refreshTree();

        },
        _generarSubcapasNodoMultiple: function (l, dataLayer, dataLayer1) {
            if (dataLayer1.wms) {
                this._generarSubcapasWMS(l, dataLayer1, dataLayer.options.id, l.id);
            } else {
                this._generarSubcapasArcgis(l, dataLayer1, dataLayer.options.id,  l.id);
            }

        },
        _generarNodoMultiple: function (dataLayer) {
            this._data.push({ id: dataLayer.options.id, name: dataLayer.options.id, tooltip: dataLayer.tooltip || "", type: 'multiple', multiple: dataLayer.multiple, parent: 'root', opacity: dataLayer.options.opacity });
            arrayUtil.forEach(dataLayer.multiple, function (dataLayer1) {
                this._getLegendJSON(dataLayer1.url + "/legend"); //Traigo todo
                var l = this.mapa.map.getLayer(dataLayer.options.id + dataLayer1.url);
                if (l !== null) {
                    if (l.loaded) {
                        this._generarSubcapasNodoMultiple(l, dataLayer, dataLayer1);
                    } else {
                        l.on("load", lang.hitch(this, this._generarSubcapasNodoMultiple, l, dataLayer, dataLayer1));
                    }
                }
            }, this);
        },
        _generarSubcapasWMS: function (l, dataLayer, parent, vparent) {
            var sublayerTooltip;
            arrayUtil.forEach(l.layerInfos, function (li, index) {
                var tParent = parent;
                if (dataLayer.sublayersTooltips) {
                    sublayerTooltip = dataLayer.sublayersTooltips[li.title] || "";
                } else {
                    sublayerTooltip = "";
                }
                this._getWMSInfo(dataLayer.url);
                if (li.parentLayerId >= 0) {
                    tParent = l.layerInfos[li.parentLayerId].name;
                }
                this._data.push({ id: li.title, name: li.title, index: index, tooltip: sublayerTooltip, type: 'layer', maxScale: li.maxScale || 0, minScale: li.minScale || 0, parent:  tParent, vparent: vparent, startChecked: li.defaultVisibility  });
                if (li.subLayers.length > 0) {
                    arrayUtil.forEach(li.subLayers, function (sl) {
                        this._data.push({ id: "prueba", name: sl.title, type: 'layer', parent:  li.title, legend: true, legendURL: sl.legendURL });
                    }, this);
                } else {
                    this._data.push({ id: "prueba", name: "", type: 'layer', parent:  li.title, legend: true, legendURL: li.legendURL });
                }
                //
                //
                //this._getLegendWMS(li.legendURL);
                //this._borrarGruposDeVisibleLayers(l, li);
            }, this);
            //this._executeGP(dataLayer.url); //Obtener escalas máximas y mínimas
        },
        _generarSubcapasArcgis: function (l, dataLayer, parent, vparent) {
            var sublayerTooltip, i;
            this._getLegendJSON(dataLayer.url + "/legend");
            arrayUtil.forEach(l.layerInfos, function (li) { 
                var tParent = parent;
                if (dataLayer.sublayersTooltips) {
                    sublayerTooltip = dataLayer.sublayersTooltips[li.name] || "";
                } else {
                    sublayerTooltip = "";
                }
                if (!dataLayer.layers || arrayUtil.indexOf(dataLayer.layers, li.id) >= 0) {
                    i = li.parentLayerId;
                    if (i >= 0) { //Si es una sub-capa de segundo nivel
                        tParent = l.layerInfos[i].name;
                    }
                    this._data.push({ id: li.name, name: li.name, index: li.id, tooltip: sublayerTooltip, type: 'layer', maxScale: li.maxScale, minScale: li.minScale, parent:  tParent, vparent: vparent, startChecked: li.defaultVisibility });
                    //this._borrarGruposDeVisibleLayers(l, li);
                }
            }, this);
        },
        _borrarGruposDeVisibleLayers: function (l, li){
            //FIXME: eliminarla si no hace falta
            var i;
            if (li.subLayerIds && li.defaultVisibility) {//Si tiene sub-capas hijas y viene marcado
                i = l.visibleLayers.indexOf(li.id);
                if (i >= 0) {
                    l.visibleLayers.splice(i, 1);
                    l.setVisibleLayers(l.visibleLayers);
                }
            }
        },
        _generarData: function () {
            var mapaConfig, dynLayers, l;
            this._data = [{ id: 'root'}];
            mapaConfig = JSON.parse(this.mapaConfigJSON);
            dynLayers = mapaConfig.mapa.dynamicLayers;
            arrayUtil.forEach(dynLayers, function (dataLayer) {
                if (dataLayer.url) { //Nodo a partir de un map service
                    l = this.mapa.map.getLayer(dataLayer.options.id);
                    if (l !== null) {
                        l.on("visibility-change", lang.hitch(this, this._adjustVisibility));
                        if (l.loaded) {
                            this._generarNodoSimple(l, dataLayer);
                        } else {
                            l.on("load", lang.hitch(this, this._generarNodoSimple, l, dataLayer));
                        }
                    }
                } else if (dataLayer.multiple) { //Nodo a partir de varios map services
                    this._generarNodoMultiple(dataLayer);
                }
            }, this);
        },
        _prenderPadresTree: function (node) {
           // var l = this.mapa.map.getLayer(item.vparent);
            var p = node.getParent();
            if (p && (p.item.id !== "root") && p.checkBox && !p.checkBox.get('checked')) {
                p.checkBox.set('checked', true);
                this._onItemClick(p.item, p);
                this._prenderPadresTree(p);
            }
        },
        _onItemClick: function (item, node) {
            var isNodeSelected = node.checkBox.get('checked'), l, visibleLayers;
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
                l = this.mapa.map.getLayer(item.vparent);
                visibleLayers = lang.clone(l.visibleLayers);

                if (item.index >= 0 && !l.layerInfos[item.index].subLayerIds && isNodeSelected) {
                    if (visibleLayers.indexOf(item.index) === -1) {
                        visibleLayers.push(parseInt(item.index));
                        l.setVisibleLayers(visibleLayers);
                        this._prenderPadresTree(node);
                    }
                } else {
                        visibleLayers = [];
                        arrayUtil.forEach(l.visibleLayers, function (laux) {
                            if (parseInt(laux) !== parseInt(item.index) && laux !== "") {
                                visibleLayers.push(parseInt(laux));
                            }
                        });
                        l.setVisibleLayers(visibleLayers);
                }
            }
        },
        _createTreeNode: function (args) {
            var tnode = new Tree._TreeNode(args), cb, slider, l, tooltip, t;
            domStyle.set(tnode.containerNode, "max-width", "200px");
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
                cb = new CheckBox({
                    checked: args.item.startChecked || false //inicializar marcado si corresponde
                });
                cb.placeAt(tnode.labelNode, "first");
                tnode.checkBox = cb;
            }
            if (args.item.legendURL) {
                tnode.labelNode.innerHTML =  "<img src='" + args.item.legendURL + "'>" + args.item.name;
            }
            if (args.item.parent === "root") { //Si está en el primer nivel
                slider = new HorizontalSlider({
                    showButtons: false,
                    style: "float:left;max-width:130px;margin-left:50px;",
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

                tnode.slider = slider;
                slider.startup();
                slider.placeAt(tnode.rowNode, "last");
            }
            return tnode;
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
        _getWMSInfo: function (url) {
             //FIXME
        },
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
        _adjustVisibility: function (item) {
        //FIXME: agregar soporte a segundo nivel capas WMS
            var scale = parseInt(scaleUtils.getScale(this.mapa.map)),
                nodes = this._tree.rootNode.getChildren(),
                layers,
                l;
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
        colapsarClick: function () {
            this._tree.collapseAll();
            // this._executeGP("http://web.renare.gub.uy/arcgis/services/SNIA/Administrativo/MapServer/WMSServer?request=GetCapabilities&service=WMS"); 
        },
        expandirClick: function () {
            //Expando todos los hijos de root para no abrir las leyendas
            var nodes = this._tree.rootNode.getChildren();
            arrayUtil.forEach(nodes, function (node) {
                this._tree._expandNode(node);
            }, this);
        },
        agregarCapa: function (dataLayer) {
            var l;
            if (dataLayer.wms) {
                esriConfig.defaults.io.corsEnabledServers.push(dataLayer.url);
                l = new WMSLayer(dataLayer.url, dataLayer.options);
            } else {
                l = new ArcGISDynamicMapServiceLayer(dataLayer.url, dataLayer.options);
            }
            if (l) {
                this.mapa.agregarCapa(l);
                if (l.loaded) {
                    this._generarNodoSimple(l, dataLayer);
                } else {
                    l.on("load", lang.hitch(this, this._generarNodoSimple, l, dataLayer));
                }
                this.refreshTree();
            }
        }
 
    });
    return TOC;
});