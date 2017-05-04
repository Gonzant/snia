/*
 * js/snia/widgets/AperturasSICAWidget
 */
/*global define, console*/
/*jslint nomen: true */
define([
    "dojo/on",
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/a11yclick",
    "dojo/text!./templates/AperturasCrucesSICAWidget.html",
    "dojo/i18n!./nls/snianls.js",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/store/Memory",
    "dijit/Tree",
    "dijit/tree/ObjectStoreModel",
    "dijit/layout/ContentPane",
    "modulos/wkids",
    "dojox/grid/DataGrid",
    "dojo/data/ObjectStore",
    "dojo/data/ItemFileWriteStore",
    "dojox/charting/Chart",
    "dojox/charting/axis2d/Default",
    "dojox/charting/plot2d/Pie",
    "dojox/charting/themes/PlotKit/green",
    "dojox/charting/themes/PlotKit/blue",
    "dojox/charting/widget/Legend",
    "dojox/charting/action2d/Tooltip",
    "dojox/charting/action2d/MoveSlice",
    "dojo/domReady!"
], function (on, Evented, declare, lang,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, a11yclick,
    template, i18n, domClass, domStyle, domConstruct,
    Memory, Tree, ObjectStoreModel, ContentPane,
    wkids, DataGrid, ObjectStore, ItemFileWriteStore, Chart, Default, Pie, green, blue, Legend,
    Tooltip, MoveSlice) {
    //"use strict";
    var widget = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
        templateString: template,
        isLayoutContainer: true,
        resize : function () {
            if (this._bcAperturas) {
                this._bcAperturas.resize();
            }
            if (this._cpIzq) {
                this._cpIzq.resize();
            }
            if (this._cpDerSC) {
                this._cpDerSC.resize();
            }
//            if (this._cpIzqSC) {
//                this._cpIzqSC.resize();
//            }
            if (this._gridCruces) {
                this._gridCruces.resize();
            }
            if (this._cpTablaCruces) {
                this._cpTablaCruces.resize();
            }
        },
        options : {
            theme : "sitWidget",
            mapa : null,
            visible : true,
            data: null,
            aperturas: null,
            config: {},
            cruces: null,
            error: null
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
            this.set("config", defaults.config);
            //listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            // classes
            this._css = {
                baseClassRadioButton: "sniaRadioButton"
            };
            this._data = defaults.data;
            this._config = defaults.config;
            this._aperturas = defaults.aperturas;
            this._crucesBuscar = defaults.cruces;
            this._error = defaults.error;
        },
        postCreate: function () {
            this.inherited(arguments);
            if (this.mapa) {
                this._cargarJSON();
            }
        },
        // start widget. called by user
        startup: function () {
            // mapa no definido
            if (!this.mapa) {
                this.destroy();
                console.log('AperturasSICAWidget::requiere un mapa');
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
        desactive : function () {},
        /* ---------------- */
        /* Funciones Privadas */
        /* ---------------- */
        _cargarTablaCruces : function () {
            var aperturasCruces, layout, f = 0, c = 0, cantCols = 0, a, i = 0, b = 0; 
            var filas = 0, cols = [], totalCols, titulo, complete = false, parametrosGrafica = [], t = "", porc, j, a, layout = [], chart1, data = { items: []  }, myNewItem, totalNum, num = 0, hectareas = 0, totalHec;
            aperturasCruces = this._aperturas.split(";");
            //Busco la primer apertura que me pasan para cargar las filas
            totalCols = this.config.data[filas].cantCol;
            this._cpTablaCruces.containerNode.innerText = " ";
            titulo = "<p class= \"Titulo1\">  </p>";
            this._gridCruces = " ";
             //grafico de torta
            this._grafica.innerHTML = " ";
            j = 0;
            for (f = 0; f < aperturasCruces.length; f = f + 1) {
                for (i = 0; i < this.config.data.length; i = i + 1) {
                    if (this.config.data[i].nro === parseInt(aperturasCruces[f])) {
                        cols[j] = i;
                        j = j + 1;
                    }
                }
            }
            this._store = new ItemFileWriteStore({data: data});
            layout = [{cells: [[], []], onBeforeRow: function (inDataIndex, inSubRows) { }}];
            this._esPrimerAperturaCruces = true;
            for (c = 0; c < cols.length; c = c + 1) {
                for (a = 0; a < this.config.data[cols[c]].columnasCruces.length; a = a + 1) {
                    if (a === 0 && c !== 0) {
                        a = a + 1;
                    }
                    layout[0].cells[0].push({name: this.config.data[cols[c]].columnasCruces[a], field : this.config.data[cols[c]].columnasCruces[a],  width: "90px"});
                }
                this._gridCruces = new DataGrid({
                    store: this._store,
                    structure: layout,
                    rowSelector: '10px'
                });
            }
            for (c =0; c < cols.length; c = c+1){ 
                 cantCols = cantCols + this.config.data[cols[c]].columnasCruces.length;
            }            
            this._data;
            var valueCruce, porcCruce, fila = 0, i_filas =0, myNewItem, i_cantCols=0, largo =0;
            largo = this.config.data[cols[0]].filasCruces.length; 
            if(this._error !== "0") //entonces es 1
                largo = 1;
            
            for (i_filas = 0; i_filas < largo; i_filas = i_filas +1){ //primer apertura 
                myNewItem = new Object();
                i_cantCols =0;
            
                for (var c = 0; c < cols.length ; c = c + 1){  //recorro dentro de las aperturas          
                    for (var i =0; i < this.config.data[cols[c]].columnasCruces.length; i = i+1){//dentro de cada apertura las columnas
                        if(i===0 && c !== 0){
                            i = i+1;
                        }
                        
                        if(i === 0 && c === 0){
                            Object.defineProperty(myNewItem, this.config.data[cols[c]].columnasCruces[i], {value: this.config.data[cols[0]].filasCruces[i_filas], writable:true, enumerable:true, configurable:true}); 
                        }else{
                        switch (this.config.data[cols[0]].apertura){
                            case "Apertura1":
                                            valueCruce = this._data.Cruces[cols[0]].Apertura1[i_filas][i_cantCols];
                                            break;
                            case "Apertura2":
                                            valueCruce = this._data.Cruces[cols[0]].Apertura2[i_filas][i_cantCols];
                                            break;
                            case "Apertura4":
                                            valueCruce = this._data.Cruces[cols[0]].Apertura4[i_filas][i_cantCols];
                                            break;
                            case "Apertura5":
                                            valueCruce = this._data.Cruces[cols[0]].Apertura5[i_filas][i_cantCols];
                                            break;
                            case "Apertura6":
                                            valueCruce = this._data.Cruces[cols[0]].Apertura6[i_filas][i_cantCols];
                                            break;
                            case "Apertura7":
                                            valueCruce = this._data.Cruces[cols[0]].Apertura7[i_filas][i_cantCols];
                                            break;
                            case "Apertura8":
                                            valueCruce = this._data.Cruces[cols[0]].Apertura8[i_filas][i_cantCols];
                                            break;
                            case "Apertura9":
                                            valueCruce = this._data.Cruces[cols[0]].Apertura9[i_filas][i_cantCols];
                                            break;
                            case "Apertura13":
                                            valueCruce = this._data.Cruces[cols[0]].Apertura13[i_filas][i_cantCols];
                                            break;
                            case "Apertura14":
                                            valueCruce = this._data.Cruces[cols[0]].Apertura14[i_filas][i_cantCols];
                                            break;                                            
                        } 
                        Object.defineProperty(myNewItem, this.config.data[cols[c]].columnasCruces[i], {value: valueCruce, writable:true, enumerable:true, configurable:true}); 
                        i_cantCols = i_cantCols +1;
                    }
                }  
            }
            this._store.newItem(myNewItem);
            }         
            this._gridCruces.placeAt(this._cpTablaCruces);                             
            this._gridCruces.startup();
        },
        _cargarJSON: function () {
            var bD1, bI1, div1, i;
            bD1 = new ContentPane({  //Derecho
                region: "center",
                style: "width: 280px; height: 400px;"
            });
            this._cpDerSC.addChild(bD1);
//            bI1 = new ContentPane({ //Izquierdo
//                region: "center",
//                style: "width: 180px; height: 400px;"
//            });
//            this._cpIzqSC.addChild(bI1);
//            div1 = domConstruct.create('div', {}, bI1.containerNode);            
//            if(this._crucesBuscar === false){    
//                this._store = new Memory({
//                    data: [{ name: "raiz", id: "root"}],
//                    getChildren: function (object) {
//                        return this.query({parent: object.id});
//                    }
//                });
//                for (i = 0; i < this._aperturas.length; i = i + 1) {
//                    this._store.put({id: i, name: this._aperturas[i].label, parent: "root", nodo: "raiz" });
//                }
//                this._myModel = new ObjectStoreModel({
//                    store: this._store,
//                    query: {id:  "root"}
//                });
//                this._tree = new Tree({
//                    model: this._myModel,
//                    showRoot: false,
//                    openOnClick: true,
//                    autoExpand: true,
//                    getIconClass: function () {
//                        return "custimg";
//                    },
//                    onOpen: lang.hitch(this, function (item, node) {
//                        var children, c, nodoItem, esHijo;
//                        children = node.getChildren();
//                        for (c in children) {
//                            if (children.hasOwnProperty(c)) {
//                                nodoItem = children[c].get('item');
//                                esHijo = nodoItem.nodo.toString() === "hijo";
//                                if (this._tree && nodoItem && !esHijo) {
//                                    this._tree._expandNode(children[c]);
//                                }
//                            }
//                        }
//                    }),
//                    onClick: lang.hitch(this, this._treeClick)
//              });
//                this._tree.placeAt(div1);
//                this._tree.startup();         
//            }
//            else{
                this._cargarTablaCruces();
//            }
        },
     
       
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
        },
        _updateThemeWatch: function (attr, oldVal, newVal) {
            if (this.get("loaded")) {
                domClass.remove(this.domNode, oldVal);
                domClass.add(this.domNode, newVal);
            }
        }
    });
    return widget;
});
