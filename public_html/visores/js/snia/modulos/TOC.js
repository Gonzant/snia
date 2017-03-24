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
    "esri/layers/WFSLayer",
    "esri/geometry/scaleUtils",
    "esri/tasks/Geoprocessor",
    "esri/request",
    "dojo/domReady!"
], function (on, Evented, declare, lang, arrayUtil,
     domClass, domStyle,
     Memory, Tree, ObjectStoreModel,
     Tooltip, HorizontalSlider, CheckBox,
     ArcGISDynamicMapServiceLayer, esriConfig, WMSLayer, WFSLayer, scaleUtils, Geoprocessor,
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
            domStyle.set(this._tree.domNode, "overflow", "hidden");
        },
        _executeGP: function (url) {
            this._gpXMLInfo = new Geoprocessor(this.proxyXML2JSON);
            this._gpURL = url;
            var params = {"UrlXMl": url};
            this._gpXMLInfo.submitJob(params, lang.hitch(this, this._completeCallback), this._statusCallback);
        },
        _statusCallback:  function (jobInfo) {
            console.log(jobInfo.jobStatus);
        },
        _completeCallback: function (jobInfo) {
            this._gpXMLInfo.getResultData(jobInfo.jobId, "Resultado", lang.hitch(this, function (json) {
                this._setScalesMinMax(json);
            }));
            //this.refreshTree();
        },
        _setScalesMinMax: function (json) {
            var sid, r, aux, values, v1, v2;
            r = this._getScaleMinMaxFromJson(json);
            arrayUtil.forEach(this._data, function (tl) {
                if (tl.wms && tl.url === this._gpURL) {
                    sid = tl.id;
                }
            }, this);
            arrayUtil.forEach(this._data, function (tl) {
                if (tl.parent === sid) {
                    aux = tl.name;
                    if (r[aux]) {
                        if (r[aux].MaxScaleDenominator) {
                            values = r[aux].MaxScaleDenominator.split(".");
                            v1 = parseFloat(values[0]);
                            v2 = parseFloat("0." + values[1]);
                            tl.minScale = Math.round((v1 + v2) * 1.058267716535966); //Swap MaxScaleDenominator por minScale
                        }
                        if (r[aux].MinScaleDenominator) {
                            values = r[aux].MinScaleDenominator.split(".");
                            v1 = parseFloat(values[0]);
                            v2 = parseFloat("0." + values[1]);
                            tl.maxScale = Math.round((v1 + v2) * 1.058267716535966); //Swap MinScaleDenominator por maxScale
                        }
                    }
                }
            }, this);
        },
        _getScaleMinMaxFromJson: function (json) {
            var layer = json.value.WMS_Capabilities.Capability.Layer, r = {};
            arrayUtil.forEach(layer.Layer, function (l) {
                r[l.Title] = {};
                r[l.Title].MaxScaleDenominator = l.MaxScaleDenominator;
                r[l.Title].MinScaleDenominator = l.MinScaleDenominator;
            }, this);
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
        _generarNodoRoot: function (l, dataLayer){
            this._data.push({ id: 'root->' + dataLayer.options.id, name: dataLayer.options.id, wms: dataLayer.wms, wfs: dataLayer.wfs, tooltip: dataLayer.tooltip || "", type: 'mapservice', parent: 'DUMMY', opacity: dataLayer.options.opacity, url: dataLayer.url, startChecked: dataLayer.options.visible });
            if (l.loaded) {
                this._generarNodoSimple(l, dataLayer);
            } else {
                l.on("load", lang.hitch(this, this._generarNodoSimple, l, dataLayer));
               // l.on("error", lang.hitch(this, this._eliminarNodoRoot, dataLayer.options.id));
            }
            //this.refreshTree();
        },
        /*_eliminarNodoRoot: function(id) {
            var index;
            arrayUtil.forEach(this._data, function (d, i) {
                if (d.parent === "root" && d.name === id ){
                   index = i;
                }
            }, this);
             this._data.splice(index, 1); //Eliminar 1 elemento a partir de index

            this.refreshTree();
        },*/
        _generarNodoSimple: function (l, dataLayer) {
            arrayUtil.forEach(this._data, function (d) {
                if (d.name === dataLayer.options.id && d.type === 'mapservice'){
                    d.maxScale = l.maxScale;
                    d.minScale = l.minScale; 
                    d.parent = "root";
                }
            }, this);
            //Procesar subcapas
            if (dataLayer.wms || dataLayer.wfs) { // Si es WMS
                this._generarSubcapasWMS(l, dataLayer, dataLayer.options.id, dataLayer.options.id);
            } else {
                this._generarSubcapasArcgis(l, dataLayer, dataLayer.options.id, dataLayer.options.id);
            }
            this.refreshTree();

        },
        _generarSubcapasNodoMultiple: function (l, dataLayer, dataLayer1) {
            if (dataLayer1.wms || dataLayer.wfs) {
                this._generarSubcapasWMS(l, dataLayer1, dataLayer.options.id, l.id);
            } else {
                this._generarSubcapasArcgis(l, dataLayer1, dataLayer.options.id,  l.id);
            }

        },
        _generarNodoMultiple: function (dataLayer) {
            this._data.push({ id: 'root->' + dataLayer.options.id, name: dataLayer.options.id, tooltip: dataLayer.tooltip || "", type: 'multiple', multiple: dataLayer.multiple, parent: 'root', opacity: dataLayer.options.opacity });
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
                if (li.parentLayerId >= 0) {
                    tParent = l.layerInfos[li.parentLayerId].name;
                }
                this._data.push({ id: "root->" + tParent + "->" + li.title, name: li.title, visLayId:li.name, index: index, tooltip: sublayerTooltip, type: 'layer', maxScale: li.maxScale || 0, minScale: li.minScale || 0, parent:  "root->" + tParent, vparent: vparent, startChecked: li.defaultVisibility  });
                if (li.subLayers.length > 0) {
                    arrayUtil.forEach(li.subLayers, function (sl) {
                        this._data.push({ id: tParent + "->" + li.title + "->" + sl.title, name: sl.title, visLayId:sl.name, type: 'layer', parent:  tParent + "->" + li.title, legend: true, legendURL: sl.legendURL });
                    }, this);
                } else {
                    this._data.push({ id: tParent + "->" + li.title + "->", name: "", type: 'layer', parent:  tParent + "->" + li.title, legend: true, legendURL: li.legendURL });
                }
                //this._borrarGruposDeVisibleLayers(l, li);
            }, this);
            this._executeGP(dataLayer.url); //Obtener escalas máximas y mínimas
        },
        _generarSubcapasArcgis: function (l, dataLayer, parent, vparent) {
            var sublayerTooltip, i, visibleLayers;
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
                        tParent = tParent +"->" + l.layerInfos[i].name;
                    }
                    this._data.push({ id: "root->" + tParent + "->" + li.name, name: li.name, visLayId: li.id, index: li.id, tooltip: sublayerTooltip, type: 'layer', maxScale: li.maxScale, minScale: li.minScale, parent:  "root->" + tParent, vparent: vparent, startChecked: li.defaultVisibility });
                    //this._borrarGruposDeVisibleLayers(l, li);
                }
                if (dataLayer.layers && !(arrayUtil.indexOf(dataLayer.layers, li.id) >= 0) && li.defaultVisibility) {
                    //ocultarla si por defecto esta visbile pero no se incluye en la lista
                    li.defaultVisibility = false;
                    visibleLayers = [];
                    arrayUtil.forEach(l.visibleLayers, function (laux) {
                        if (parseInt(laux) !== parseInt(li.id) && laux !== "") {
                            visibleLayers.push(parseInt(laux));
                        }
                    }, this);
                    l.setVisibleLayers(visibleLayers);
                }
            }, this);
        },
        /*_borrarGruposDeVisibleLayers: function (l, li){
            //FIXME: eliminarla si no hace falta
            var i;
            if (li.subLayerIds && li.defaultVisibility) {//Si tiene sub-capas hijas y viene marcado
                i = l.visibleLayers.indexOf(li.id);
                if (i >= 0) {
                    l.visibleLayers.splice(i, 1);
                    l.setVisibleLayers(l.visibleLayers);
                }
            }
        },*/
        _generarData: function () {
            var mapaConfig, dynLayers, l;
            this._data = [{ id: 'root'}];
            this.mapaConfig = JSON.parse(this.mapaConfigJSON);
            dynLayers = this.mapaConfig.mapa.dynamicLayers;
            arrayUtil.forEach(dynLayers, function (dataLayer) {
                if (dataLayer.url) { //Nodo a partir de un map service
                    l = this.mapa.map.getLayer(dataLayer.options.id);
                    if ((typeof l !== 'undefined') && (l !== null)) {
                        l.on("visibility-change", lang.hitch(this, this._adjustVisibility));
                        this._generarNodoRoot(l, dataLayer);
                    }
                } else if (dataLayer.multiple) { //Nodo a partir de varios map services
                    this._generarNodoMultiple(dataLayer);
                }
            }, this);
        },
        _prenderPadresTree: function (node) {
            var p = node.getParent();
            if (p && (p.item.id !== "root") && p.checkBox && !p.checkBox.get('checked')) {
                p.checkBox.set('checked', true);
                this._onItemClick(p.item, p);
                //this._prenderPadresTree(p);
            }
        },
        _onItemClick: function (item, node) {
            var isNodeSelected = node.checkBox.get('checked'), l, visibleLayers, nodes, hijosActivos = false;
            if (item.parent === "root") { //Si es un map service
                if (item.type === "multiple") {
                    arrayUtil.forEach(item.multiple, function (url) {
                        l = this.mapa.map.getLayer(item.name + url.url);
                        if (isNodeSelected) {
                            l.show();
                        } else {
                            l.hide();
                        }
                    }, this);
                } else {
                    l = this.mapa.map.getLayer(item.name);
                    if (isNodeSelected) {
                        l.show();
                    } else {
                        l.hide();
                    }
                }
            } else { //Si es un nodo de segundo o tercer nivel
                l = this.mapa.map.getLayer(item.vparent);
                visibleLayers = lang.clone(l.visibleLayers);
                if (isNodeSelected) {
                    //Si hay que activarlo
                    if (item.index >= 0 && l.layerInfos[item.index].subLayerIds ) {
                        //Si es nodo de segundo nivel con hijos
                        this._prenderPadresTree(node); //Activo al padre
                        
                        //Activo los hijos
                        nodes = node.getChildren();
                        arrayUtil.forEach(nodes, function (n) {
                            if (n.checkBox.get('checked')){
                                hijosActivos = true;
                            }
                        }, this);
                        if (!hijosActivos){
                            arrayUtil.forEach(nodes, function (n) {
                                n.checkBox.set('checked', true);
                                //this._onItemClick(n.item, n);
                            }, this);
                            visibleLayers = [];
                            arrayUtil.forEach( l.layerInfos[item.index].subLayerIds, function (laux) {
                                    visibleLayers.push(parseInt(laux));
                                }, this);
                            l.setVisibleLayers(visibleLayers);
                        }
                        //FIXME: Para wms las subcapas están en SubLayers
                    } else if (item.index >= 0 && !l.layerInfos[item.index].subLayerIds && isNodeSelected) {
                        //Si es de segundo o tercer nivel sin hijos
                        if (visibleLayers.indexOf(item.visLayId) === -1) {
                            //Si no está visible la hago visible
                            visibleLayers.push(item.visLayId);
                            l.setVisibleLayers(visibleLayers);
                            this._prenderPadresTree(node);
                        }
                    }
                } else {
                    //Si hay que desactivarlo
                    visibleLayers = [];
                    arrayUtil.forEach(l.visibleLayers, function (laux) {
                        if (laux !== item.visLayId && laux !== "") {//Agrego todos menos el nodo
                            if (!l.layerInfos[item.index].subLayerIds || l.layerInfos[item.index].subLayerIds.indexOf(parseInt(laux))=== -1){// Y sus hijos tampoco
                                visibleLayers.push(laux);
                            }
                        }
                    }, this);
                    //Uncheck hijos
                    nodes = node.getChildren();
                    arrayUtil.forEach(nodes, function (n) {
                        if (n.checkBox){
                            n.checkBox.set('checked', false);
                        }
                    }, this);                
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
                                l = this.mapa.map.getLayer(args.item.name);
                                l.setOpacity(value / 100);
                            } else { //Si es un nodo múltiple args.item.type === "multiple"
                                arrayUtil.forEach(args.item.multiple, function (dataLayer) {
                                    l = this.mapa.map.getLayer(args.item.name + dataLayer.url);
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
        _getLegendJSON: function (url) {
            var requestHandle = esriRequest({
                "url": url,
                "content": {
                    "f": "pjson"
                },
                "callbackParamName": "callback"
            });
            requestHandle.then(lang.hitch(this, this._requestSucceededLegendJSON), this._requestFailed);
        },
        _requestFailed: function (){
             console.log('TOC: Falla al cargar leyendas');
        },
        _requestSucceededLegendJSON: function (response) {
            var tocNode;
            arrayUtil.forEach(response.layers, function (layer) {
                tocNode = arrayUtil.filter(this._data, function (item) {
                    return item.name === layer.layerName && (!item.index || item.index === layer.layerId);
                });
                if (tocNode.length > 0) { //Si la capa está incluida en la tabla de contenidos
                    if (layer.legend.length === 1) { // una hoja
                        tocNode[0].imageData =  layer.legend[0].imageData;
                        tocNode[0].contentType = layer.legend[0].contentType;
                    } else { // multiples hojas
                        arrayUtil.forEach(layer.legend, function (layerLegend) {
                            this._data.push({ id: tocNode[0].parent + "->" + layer.layerName + "->" + layerLegend.label, name: layerLegend.label, legend: true, parent:  tocNode[0].parent + "->" + layer.layerName, imageData:  layerLegend.imageData, contentType: layerLegend.contentType });
                        }, this);
                    }
                }
            }, this);
            //this.refreshTree();
        },
        _nodeAdjustVisibility: function (node, scale) {
            if (node.hasChildren()){
                arrayUtil.forEach(node.getChildren(), function (sublayer) {
                    var layerOutScale = (sublayer.item.maxScale !== 0 && scale < sublayer.item.maxScale) || (sublayer.item.minScale !== 0 && scale > sublayer.item.minScale);
                    if (layerOutScale) {
                        domClass.add(sublayer.domNode, 'TOCOutOfScale');
                    } else {
                        domClass.remove(sublayer.domNode, 'TOCOutOfScale');
                    }
                    this._nodeAdjustVisibility(sublayer, scale);
                }, this);
            }
        },
        /*_adjustVisibilityOld: function (item) {
        //Actualizar visibilidad de items en el árbol de contenidos
            var scale = parseInt(scaleUtils.getScale(this.mapa.map)),
                nodes = this._tree.rootNode.getChildren(),
                l;
            arrayUtil.forEach(nodes, function (node) {
                if (!item || !item.id || (item.id && node.item.id === item.id)) {
                    //Si no se definió item o 
                    var nodeOutScale;
                    if (node.item.wms || node.item.wfs) {
                        l = this.mapa.map.getLayer(node.item.name);
                        nodeOutScale = !l.visibleAtMapScale;
                    } else {
                        nodeOutScale = (node.item.maxScale !== 0 && scale < node.item.maxScale) || (node.item.minScale !== 0 && scale > node.item.minScale);
                    }
                    if (nodeOutScale) {
                        domClass.add(node.domNode, 'TOCOutOfScale');
                    } else {
                        domClass.remove(node.domNode, 'TOCOutOfScale');
                    }
                    this._nodeAdjustVisibility(node, scale);
                } else if (item.id && node.item.id === item.parent){
                    this._nodeAdjustVisibility(node, scale);
                }
            }, this);
        },*/
        _adjustVisibility: function (item) {
        //Actualizar visibilidad de items en el árbol de contenidos
            var scale = parseInt(scaleUtils.getScale(this.mapa.map));
            if (item && item.id) {
                //Si se definio el parametro item actualizo sólo ese y sus hijos
                arrayUtil.forEach(this._tree.rootNode.getChildren(), function (node) {
                    var itemNode;
                    //Busco el nodo
                    if (node.item.id === item.id){//Si encuentro el nodo en los hijos de root
                        itemNode = node;
                    } else if (node.item.id === item.parent){ //Si encuentro al padre del nodo entre los hijos de root
                        arrayUtil.forEach(node.getChildren(), function (snode) {
                            if (snode.item.id === item.id){
                                itemNode = snode;
                            } 
                        }, this);
                    }
                    if (itemNode) {
                        //Si encontre el nodo actualizo su estado en el arbol
                        this._nodeAdjustVisibility(itemNode, scale);
                    }

                }, this);
            } else {
                //Si no se definió parámetro item actualizo todos los nodos
                this._nodeAdjustVisibility(this._tree.rootNode, scale);
            }
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
            this._generarData();
        },
        expandirClick: function () {
            //Expando todos los hijos de root para no abrir las leyendas
            var nodes = this._tree.rootNode.getChildren();
            arrayUtil.forEach(nodes, function (node) {
                this._tree._expandNode(node);
            }, this);
        },
        agregarCapa: function (dataLayer, nodoExistente) {
        // El parametro nodoExistente es opcional, se asume falso
            var l;
            if (dataLayer.wms) {
                esriConfig.defaults.io.corsEnabledServers.push(dataLayer.url);
                l = new WMSLayer(dataLayer.url, dataLayer.options);
            } else if (dataLayer.wfs) {
                esriConfig.defaults.io.corsEnabledServers.push(dataLayer.url);
                l = new WFSLayer(dataLayer.url, dataLayer.options);
            } else {
                l = new ArcGISDynamicMapServiceLayer(dataLayer.url, dataLayer.options);
            }
            if (l) {
                this.mapa.agregarCapa(l);
                if (!nodoExistente){
                    this._generarNodoRoot(l, dataLayer);
                } 
            }
        },
        actualizarCapa: function (id, url) {
            //Elimina el map service identificado por "id" y lo sustituye por uno nuevo 
            //cargado a partir de la url "url" manteniendo las opciones que tenía
            //Asume que las subcapas son exactamente las mismas
            var dynLayers = this.mapaConfig.mapa.dynamicLayers;
            arrayUtil.forEach(dynLayers, function (dataLayer) {
                if (dataLayer.options.id === id) { //Nodo a partir de un map service
                    var l = this.mapa.map.getLayer(dataLayer.options.id), 
                    nodoExistente = true, visibleLayers, newl, visible;
                    if ((typeof l !== 'undefined') && (l !== null)) {
                        visibleLayers = lang.clone(l.visibleLayers);
                        visible = l.visible;
                        this.mapa.removerCapa(l);
                        dataLayer.url = url;
                        this.agregarCapa(dataLayer, nodoExistente);
                        //Intento obtener la nueva capa y definir las subcapas visibles
                        newl = this.mapa.map.getLayer(dataLayer.options.id);
                        if ((typeof newl !== 'undefined') && (newl !== null)) {
                            newl.setVisibleLayers(visibleLayers);
                            if (visible){
                                newl.show();
                            } else {
                                newl.hide();
                            }
                        }
                    }
                }
            }, this);
        }
    });
    return TOC;
});