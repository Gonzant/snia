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
    "dojo/text!./templates/AperturasSICAWidget.html",
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
            if (this._cpIzqSC) {
                this._cpIzqSC.resize();
            }
            if (this._grid) {
                this._grid.resize();
            }
            if (this._cpTabla) {
                this._cpTabla.resize();
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
        desactive : function () {},
        /* ---------------- */
        /* Funciones Privadas */
        /* ---------------- */
        _cargarTablaCruces : function () {
            var aperturasCruces, layout, cantCols=0, a, i = 0, b = 0, filas = 0, cols = [], totalCols, titulo, tip, legendTwo, complete = false, mag1, parametrosGrafica = [], t = "", porc, i, j, a, layout = [], chart1, data = { items: []  }, myNewItem, totalNum, num = 0, hectareas = 0, totalHec;
            aperturasCruces = this._aperturas.split(";");
            //Busco la primer apertura que me pasan para cargar las filas
            totalCols = this.config.data[filas].cantCol;
            this._cpTabla.containerNode.innerText = " ";
            titulo = "<p class= \"Titulo1\">  </p>";
            this._grid = " ";
             //grafico de torta
            this._grafica.innerHTML = " ";
            j =0;
            
            for (var f = 0; f < aperturasCruces.length; f = f + 1){
                for (i = 0; i < this.config.data.length; i = i + 1){
                    if(this.config.data[i].nro === parseInt(aperturasCruces[f])){
                        cols[j] = i;
                        j = j+1;
                    }                 
                }
            }  
            this._store = new ItemFileWriteStore({data: data});
            layout = [{cells: [[], []], onBeforeRow: function (inDataIndex, inSubRows) { }}];
            this._esPrimerAperturaCruces = true; 
            for (var c =0; c < cols.length; c = c+1){                
                for (a = 0; a < this.config.data[cols[c]].columnasCruces.length; a = a + 1) {
                    if(a===0 && c !== 0){
                        a = a+1;
                    }
                    layout[0].cells[0].push({name: this.config.data[cols[c]].columnasCruces[a], field : this.config.data[cols[c]].columnasCruces[a],  width: "90px"});
                }
                this._grid = new DataGrid({
                    store: this._store,
                    structure: layout,
                    rowSelector: '10px'
                });                
            }            
            for (var c =0; c < cols.length; c = c+1){ 
                 cantCols = cantCols + this.config.data[cols[c]].columnasCruces.length;
            }            
            this._data;
            var valueCruce, porcCruce, fila = 0, i_filas =0, myNewItem, i_cantCols=0, largo =0;
            largo = this.config.data[cols[0]].filasCruces.length; 
            if(this._error !== "0") //entonces es 1
                largo = 1;
//            
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
//                            Object.defineProperty(myNewItem, this.config.data[cols[c]].columnasCruces[i+1], {value: valueCruce, writable:true, enumerable:true, configurable:true}); 
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
//           
            this._grid.placeAt(this._cpTabla);                             
            this._grid.startup();
        },
        _cargarJSON: function () {
            var bD1, bI1, div1, i;
            bD1 = new ContentPane({  //Derecho
                region: "center",
                style: "width: 280px; height: 400px;"
            });
            this._cpDerSC.addChild(bD1);
            bI1 = new ContentPane({ //Izquierdo
                region: "center",
                style: "width: 180px; height: 400px;"
            });
            this._cpIzqSC.addChild(bI1);
            div1 = domConstruct.create('div', {}, bI1.containerNode);            
            if(this._crucesBuscar === false){    
                this._store = new Memory({
                    data: [{ name: "raiz", id: "root"}],
                    getChildren: function (object) {
                        return this.query({parent: object.id});
                    }
                });
                for (i = 0; i < this._aperturas.length; i = i + 1) {
                    this._store.put({id: i, name: this._aperturas[i].label, parent: "root", nodo: "raiz" });
                }
                this._myModel = new ObjectStoreModel({
                    store: this._store,
                    query: {id:  "root"}
                });
                this._tree = new Tree({
                    model: this._myModel,
                    showRoot: false,
                    openOnClick: true,
                    autoExpand: true,
                    getIconClass: function () {
                        return "custimg";
                    },
                    onOpen: lang.hitch(this, function (item, node) {
                        var children, c, nodoItem, esHijo;
                        children = node.getChildren();
                        for (c in children) {
                            if (children.hasOwnProperty(c)) {
                                nodoItem = children[c].get('item');
                                esHijo = nodoItem.nodo.toString() === "hijo";
                                if (this._tree && nodoItem && !esHijo) {
                                    this._tree._expandNode(children[c]);
                                }
                            }
                        }
                    }),
                    onClick: lang.hitch(this, this._treeClick)
              });
                this._tree.placeAt(div1);
                this._tree.startup();         
            }
            else{
                this._cargarTablaCruces();
            }
        },
     
        _treeClick : function (item) {
            this._cpTabla.containerNode.innerHTML = " ";
            this._cpTabla.containerNode.innerText = " ";
            var titulo, tip, legendTwo, complete = false, largo=1, mag1, parametrosGrafica = [], t = "", porc, i, j, a, layout = [], chart1, data = { items: []  }, myNewItem, totalNum, num = 0, hectareas = 0, totalHec;;
            titulo = "<p class= \"Titulo1\">" + item.name + "</p>";
            this._grid = " ";
             //grafico de torta
            this._grafica.innerHTML = " ";
            chart1 = new Chart("pieChart1");
            chart1.addPlot("default", {type: Pie, labels: "none"});
            chart1.setTheme(green);
            chart1.addAxis("x");
            chart1.addAxis("y", {vertical: true});
            //this._data - el json que me pasa Fabi
//            // this._aperturas  - mi json con lo que tengo buscar en el data
            for (i = 0; i < this._data.Cruces.length; i = i + 1) {
                largo = 0; //inicializo el largo
                for (j = 0; j < this._aperturas.length; j = j + 1) {
                    if (this.config.data[i].nombre === this._aperturas[j].label &&
                            item.name === this._aperturas[j].label) {
//                        //estoy en la apertura a recorrer
                        this._tabla = "<p>" + this.config.data[i].tituloTabla + "</p>";
                        this._store = new ItemFileWriteStore({data: data});
                        layout = [{cells: [[], [], []], onBeforeRow: function (inDataIndex, inSubRows) {inSubRows[0].invisible = true; }}];
                        for (a = 0; a < this.config.data[i].cantCol + 1; a = a + 1) {
                            layout[0].cells[0].push({width: 10});
                        }
                        for (a = 0; a < this.config.data[i].divisiones.length; a = a + 1) {
                            layout[0].cells[1].push({name: this.config.data[i].divisiones[a], field: "", colSpan: this.config.data[i].subDiv[a]});
                        }
                        for (a = 0; a < this.config.data[i].columnas.length; a = a + 1) {
                            layout[0].cells[2].push({name: this.config.data[i].columnas[a], field : this.config.data[i].columnasField[a],  width: this.config.data[i].columnasW[a]});
                        }
                        this._divTitulo.innerHTML = "<div style = \"width:500px\" >" + titulo + this._tabla + "<br></div> ";
                        this._grid = new DataGrid({
                            store: this._store,
                            structure: layout,
                            rowSelector: '10px'
                        });
                        this._grid.placeAt(this._cpTabla);
                        largo = this.config.data[i].filas.length;
                        if(this._error !== "0"){ //entonces es 1
                            this._largoFilasAp = this._error.split(";");
                            for (var c = 1 ; c < this._largoFilasAp.length && largo !== 0; c = c + 1){
                                if(this.config.data[i].nro === parseInt(this._largoFilasAp[c]))
                                    largo = 1;
                            }                           
                        }
                        for (a = 0; a < largo; a = a + 1) {
                            switch (this._aperturas[j].nombre) {
                            case "Apertura1":
                                totalNum = this._data.Cruces[i].Apertura1[0][0];
                                totalHec = this._data.Cruces[i].Apertura1[0][1];
                                if (totalNum !== 0) { num = this._data.Cruces[i].Apertura1[a][0] * 100 / totalNum; }
                                if (totalHec !== 0) { hectareas = this._data.Cruces[i].Apertura1[a][1] * 100 / totalHec; }
                                myNewItem = {Ap1: this.config.data[i].filas[a], Num: this._data.Cruces[i].Apertura1[a][0], PorcN: num.toFixed(0), Hect: this._data.Cruces[i].Apertura1[a][1], PorcH: hectareas.toFixed(0)};
                                if (a !== 0) {
                                    t = this._data.Cruces[i].Apertura1[a][0] + " es " + num.toFixed(0) + "%";
                                    parametrosGrafica.push({y: this._data.Cruces[i].Apertura1[a][0], text: this.config.data[i].filas[a], stroke: "white", tooltip: t});
                                }
                                break;
                            case "Apertura2":
                                totalHec = this._data.Cruces[i].Apertura2[0];
                                if (totalHec !== 0) { hectareas = this._data.Cruces[i].Apertura2[a] * 100 / totalHec; }
                                myNewItem = {Ap2: this.config.data[i].filas[a], Hect: this._data.Cruces[i].Apertura2[a], Porc: hectareas.toFixed(0)};
                                if (a !== 0) {
                                    t = this._data.Cruces[i].Apertura2[a] + " es " + hectareas.toFixed(0) + "%";
                                    parametrosGrafica.push({y: this._data.Cruces[i].Apertura2[a], text: this.config.data[i].filas[a], stroke: "black", tooltip: t});
                                }
                                break;
                            case "Apertura4":
                                myNewItem = {Ap4: this.config.data[i].filas[a], ne: this._data.Cruces[i].Apertura4[a][0], se: this._data.Cruces[i].Apertura4[a][1], Total: this._data.Cruces[i].Apertura4[a][2], Toros: this._data.Cruces[i].Apertura4[a][3], VyV : this._data.Cruces[i].Apertura4[a][4], Vi: this._data.Cruces[i].Apertura4[a][5], Nov3: this._data.Cruces[i].Apertura4[a][6], Nov2: this._data.Cruces[i].Apertura4[a][7], Nov1: this._data.Cruces[i].Apertura4[a][8], Vaq2: this._data.Cruces[i].Apertura4[a][9], Vaq1: this._data.Cruces[i].Apertura4[a][10], Ter: this._data.Cruces[i].Apertura4[a][11], Buey: this._data.Cruces[i].Apertura4[a][12]};
                                porc = this._data.Cruces[i].Apertura4[a][0] * 100 / this._data.Cruces[i].Apertura4[0][0];
                                if (a !== 0) {
                                    t = this._data.Cruces[i].Apertura4[a][0] + " es " + porc.toFixed(0) + "%";
                                    parametrosGrafica.push({y: this._data.Cruces[i].Apertura4[a][0], text: this.config.data[i].filas[a], stroke: "black", tooltip: t});
                                }
                                break;
                            case "Apertura5":
                                myNewItem = {Ap5: this.config.data[i].filas[a], ne: this._data.Cruces[i].Apertura5[a][0], se: this._data.Cruces[i].Apertura5[a][1], Total: this._data.Cruces[i].Apertura5[a][2], Carn: this._data.Cruces[i].Apertura5[a][3], OveCria : this._data.Cruces[i].Apertura5[a][4], OvCons: this._data.Cruces[i].Apertura5[a][5], Borr2: this._data.Cruces[i].Apertura5[a][6], CordA: this._data.Cruces[i].Apertura5[a][7], CordO: this._data.Cruces[i].Apertura5[a][8], CordM: this._data.Cruces[i].Apertura5[a][9]};
                                porc = this._data.Cruces[i].Apertura5[a][0] * 100 / this._data.Cruces[i].Apertura5[0][0];
                                if (a !== 0) {
                                    t = this._data.Cruces[i].Apertura5[a][0] + " es " + porc.toFixed(0) + "%";
                                    parametrosGrafica.push({y: this._data.Cruces[i].Apertura5[a][0], text: this.config.data[i].filas[a], stroke: "black", tooltip: t});
                                }
                                break;
                            case "Apertura6":
                                myNewItem = {Ap6: this.config.data[i].filas[a], ne: this._data.Cruces[i].Apertura6[a][0], se: this._data.Cruces[i].Apertura6[a][1], total: this._data.Cruces[i].Apertura6[a][2], vs: this._data.Cruces[i].Apertura6[a][3], vo : this._data.Cruces[i].Apertura6[a][4], tm: this._data.Cruces[i].Apertura6[a][5], pl: this._data.Cruces[i].Apertura6[a][6]};
                                porc = this._data.Cruces[i].Apertura6[a][0] * 100 / this._data.Cruces[i].Apertura6[0][0];
                                if (a !== 0) {
                                    t = this._data.Cruces[i].Apertura6[a][0] + " es " + porc.toFixed(0) + "%";
                                    parametrosGrafica.push({y: this._data.Cruces[i].Apertura6[a][0], text: this.config.data[i].filas[a], stroke: "black", tooltip: t});
                                }
                                break;
                            case "Apertura7":
                                totalNum = this._data.Cruces[i].Apertura7[0][0];
                                totalHec = this._data.Cruces[i].Apertura7[0][1];
                                if (totalNum !== 0) { num = this._data.Cruces[i].Apertura7[a][0] * 100 / totalNum; }
                                if (totalHec !== 0) { hectareas = this._data.Cruces[i].Apertura7[a][1] * 100 / totalHec; }
                                myNewItem = {Ap7: this.config.data[i].filas[a], nro: this._data.Cruces[i].Apertura7[a][0], pocN: num.toFixed(0), hect: this._data.Cruces[i].Apertura7[a][1], nroH: hectareas.toFixed(0)};
                                if (a !== 0) {
                                    t = this._data.Cruces[i].Apertura7[a][0] + " es " + num.toFixed(0) + "%";
                                    parametrosGrafica.push({y: this._data.Cruces[i].Apertura7[a][0], text: this.config.data[i].filas[a], stroke: "black", tooltip: t});
                                }
                                break;
                            case "Apertura8":
                                myNewItem = {Ap8: this.config.data[i].filas[a], total: this._data.Cruces[i].Apertura8[a][0], enProd: this._data.Cruces[i].Apertura8[a][1], nt: this._data.Cruces[i].Apertura8[a][2], np: this._data.Cruces[i].Apertura8[a][3], mt: this._data.Cruces[i].Apertura8[a][4], mp: this._data.Cruces[i].Apertura8[a][5], lt: this._data.Cruces[i].Apertura8[a][6], lp: this._data.Cruces[i].Apertura8[a][7], pt: this._data.Cruces[i].Apertura8[a][8], pp: this._data.Cruces[i].Apertura8[a][9], qt: this._data.Cruces[i].Apertura8[a][10], qp: this._data.Cruces[i].Apertura8[a][11]};
                                porc = this._data.Cruces[i].Apertura8[a][0] * 100 / this._data.Cruces[i].Apertura8[0][0];
                                if (a !== 0) {
                                    t = this._data.Cruces[i].Apertura8[a][0] + " es " + porc.toFixed(0) + "%";
                                    parametrosGrafica.push({y: this._data.Cruces[i].Apertura8[a][0], text: this.config.data[i].filas[a], stroke: "black", tooltip: t});
                                }
                                break;
                            case "Apertura9":
                                myNewItem = {Ap9: this.config.data[i].filas[a], tot: this._data.Cruces[i].Apertura9[a][0], ep: this._data.Cruces[i].Apertura9[a][1], mat: this._data.Cruces[i].Apertura9[a][2], map: this._data.Cruces[i].Apertura9[a][3], pt: this._data.Cruces[i].Apertura9[a][4], pp: this._data.Cruces[i].Apertura9[a][5], mt: this._data.Cruces[i].Apertura9[a][6], mp: this._data.Cruces[i].Apertura9[a][7], dt: this._data.Cruces[i].Apertura9[a][8], dp: this._data.Cruces[i].Apertura9[a][9], pet: this._data.Cruces[i].Apertura9[a][10], pep: this._data.Cruces[i].Apertura9[a][11], ct: this._data.Cruces[i].Apertura9[a][12], cp: this._data.Cruces[i].Apertura9[a][13], at: this._data.Cruces[i].Apertura9[a][14], ap: this._data.Cruces[i].Apertura9[a][15], ot: this._data.Cruces[i].Apertura9[a][16], op: this._data.Cruces[i].Apertura9[a][17]};
                                porc = this._data.Cruces[i].Apertura9[a][0] * 100 / this._data.Cruces[i].Apertura9[0][0];
                                if (a !== 0) {
                                    t = this._data.Cruces[i].Apertura9[a][0] + " es " + porc.toFixed(0) + "%";
                                    parametrosGrafica.push({y: this._data.Cruces[i].Apertura9[a][0], text: this.config.data[i].filas[a], stroke: "black", tooltip: t});
                                }
                                break;
                            case "Apertura13":
                                myNewItem = {Ap13: this.config.data[i].filas[a], t: this._data.Cruces[i].Apertura13[a][0], mez: this._data.Cruces[i].Apertura13[a][1], al: this._data.Cruces[i].Apertura13[a][2], lc: this._data.Cruces[i].Apertura13[a][3], fes: this._data.Cruces[i].Apertura13[a][4], op: this._data.Cruces[i].Apertura13[a][5]};
                                porc = this._data.Cruces[i].Apertura13[a][0] * 100 / this._data.Cruces[i].Apertura13[0][0];
                                if (a !== 0) {
                                    t = this._data.Cruces[i].Apertura13[a][0] + " es " + porc.toFixed(0) + "%";
                                    parametrosGrafica.push({y: this._data.Cruces[i].Apertura13[a][0], text: this.config.data[i].filas[a], stroke: "black", tooltip: t});
                                }
                                break;
                            case "Apertura14":
                                myNewItem = {Ap14: this.config.data[i].filas[a], Total: this._data.Cruces[i].Apertura14[a][0], mez: this._data.Cruces[i].Apertura14[a][1], tb: this._data.Cruces[i].Apertura14[a][2], lr: this._data.Cruces[i].Apertura14[a][3], lm: this._data.Cruces[i].Apertura14[a][4], op: this._data.Cruces[i].Apertura14[a][5]};
                                porc = this._data.Cruces[i].Apertura14[a][0] * 100 / this._data.Cruces[i].Apertura9[0][0];
                                if (a !== 0) {
                                    t = this._data.Cruces[i].Apertura14[a][0] + " es " + porc.toFixed(0) + "%";
                                    parametrosGrafica.push({y: this._data.Cruces[i].Apertura14[a][0], text: this.config.data[i].filas[a], stroke: "black", tooltip: t});
                                }
                                break;
                            case "Apertura18":
                                totalNum = this._data.Cruces[i].Apertura18[0][0];
                                totalHec = this._data.Cruces[i].Apertura18[0][1];
                                if (totalNum !== 0) { num = this._data.Cruces[i].Apertura18[a][0] * 100 / totalNum; }
                                if (totalHec !== 0) { hectareas = this._data.Cruces[i].Apertura18[a][1] * 100 / totalHec; }
                                myNewItem = {Ap18: this.config.data[i].filas[a], nro: this._data.Cruces[i].Apertura18[a][0], porcN: num.toFixed(0), hec: this._data.Cruces[i].Apertura18[a][1], porcH: hectareas.toFixed(0)};
                                break;
                            }
                            this._store.newItem(myNewItem);
                        }
                        complete = true;
                        this._grid.startup();
                        chart1.addSeries(this._aperturas[j].nombre, parametrosGrafica);
                        mag1 = new dojox.charting.action2d.MoveSlice(chart1, "default");
                        chart1.render();
                        legendTwo = new dojox.charting.widget.Legend({chart: chart1}, "legend");
                        tip = new Tooltip(chart1, "default");
                    }
                }
            }
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
