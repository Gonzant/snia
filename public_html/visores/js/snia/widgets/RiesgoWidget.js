/*
 * js/snia/widgets/RiesgoWidget
 * 
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
    "dojo/text!./templates/RiesgoWidget.html",
    "dojo/i18n!./nls/snianls.js",
    "dijit/a11yclick",
    "dojo/dom-class",
    "dojo/dom-style",
    "dijit/form/ComboBox",
    "dijit/layout/TabContainer",
    "dijit/layout/ContentPane",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/store/Memory",
    "esri/graphic",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "esri/Color",
    "dijit/form/Button",
    "esri/tasks/Geoprocessor",
    "esri/tasks/FeatureSet",
    "dojo/dom-attr",
    "dojox/widget/Standby",
    "dijit/Dialog",
    "widgets/RiesgoReporteWidget",
    "widgets/RiesgoDibujoWidget",
    "modulos/Dibujo",
    "modulos/CapaGrafica3SR", "dijit/Tooltip"
], function (on, Evented, declare, lang,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    template, i18n, a11yclick, domClass, domStyle, ComboBox, TabContainer,
    ContentPane, domConst, arrayUtil, Memory,
    Graphic, SimpleLineSymbol, SimpleFillSymbol, Color,
    Button, Geoprocessor, FeatureSet, domAttr, Standby,
    Dialog, RiesgoReporteWidget, RiesgoDibujoWidget, Dibujo, CapaGrafica3SR,
    Tooltip
    ) {
    //"use strict";
    var widget = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
        templateString: template,
        isLayoutContainer: true,
        resize : function () {
            if (this._tabContainer) {
                this._tabContainer.resize();
            }
        },
        options : {
            theme : "sitWidget",
            mapa : null,
            visible : true,
            active: false
        },
        constructor: function (options, srcRefNode) {
            //mezclar opciones usuario y default
            var defaults, colores, dialogReporte, dialogInformacion;
            defaults = lang.mixin({}, this.options, options);
            //nodo del widget
            this.domNode = srcRefNode;
            this._i18n = i18n;
            //propiedades     
            this.terminoConstruccion = false;
            this.set("mapa", defaults.mapa);
            this.set("theme", defaults.theme);
            this.set("visible", defaults.visible);
            this.set("active", defaults.active);

            this.set("_defAGGE", defaults.config.definicionAGGEyoE);
            this.set("_gpRiesgoUrl", defaults.config.gpRiesgo.url);
            this.set("_gpRiesgoConfig", defaults.config.gpRiesgo.configuracion);
            this.set("_gpRiesgoPredial", defaults.config.gpRiesgo.riesgoPredial);
            this.set("_gpRiesgoGeo", defaults.config.gpRiesgo.riesgoGeo);
            this.set("_gpRiesgoSalida", defaults.config.gpRiesgo.paramSalida);
            this.set("_gpRiesgoSalidaAmbiental", defaults.config.gpRiesgo.paramSalidaAmbiental);
            this.set("_gpRiesgoSalidaVarEtiq", defaults.config.gpRiesgo.paramSalidaVarEtiq);
            colores = {
                "verde": defaults.config.gpRiesgo.colores.verde,
                "amarillo": defaults.config.gpRiesgo.colores.amarillo,
                "naranja": defaults.config.gpRiesgo.colores.naranja,
                "rojo": defaults.config.gpRiesgo.colores.rojo,
                "gris": defaults.config.gpRiesgo.colores.gris
            };
            this.set("_gpColores", colores);
            this.set("_etiqRiesgoPredial", defaults.config.riesgoPredial);
            this.set("_etiqRiesgoGeo", defaults.config.riesgoGeo);
            this.set("_etiqRiesgoAmbiental", defaults.config.riesgoAmbiental);
            this.set("_etiqMarcarUbicacion", defaults.config.marcarUbicacion);
            this.set("_msjMarcarUbicacion", defaults.config.mensajeMarcarUbicacion);
            this.set("_etiqDesmarcarUbicacion", defaults.config.desmarcarUbicacion);
            this.set("_etiqInformacion", defaults.config.informacion);
            this.set("_etiqReporte", defaults.config.reporte);
            this.set("_etiqAyuda", defaults.config.ayuda);
            this.set("_configWidgetReporte", defaults.config.widgetReporte);
            dialogReporte = {
                "width": defaults.config.dialogReporte.width,
                "nombre" : defaults.config.dialogReporte.nombre,
                "titulo": defaults.config.dialogReporte.titulo,
                "marcarPunto": defaults.config.dialogReporte.marcarPunto
            };
            this.set("_etiqDialogReporte", dialogReporte);
            dialogInformacion = {
                "width": defaults.config.dialogInformacion.width,
                "titulo": defaults.config.dialogInformacion.titulo
            };
            this.set("_etiqDialogInformacion", dialogInformacion);
            //listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            this.watch("active", this._activar);
            this.watch("dibujoEnable", this._dibujoEnabledChanged);
            // classes
            this._css = {
                baseClassRadioButton: "sniaRadioButton"
            };
        },
        postCreate: function () {
            this.inherited(arguments);
            if (this.mapa) {
                this.own(
                    on(this._riesgoNode, a11yclick, lang.hitch(this, this._riesgoClick))
                );
            }
            this._gp = new Geoprocessor(this._gpRiesgoUrl);
            //Rueda de espera
            this._standby = new Standby({target: this._ruedaEspera});
            domConst.place(this._standby.domNode, this._ruedaEspera, "after");
            this._standby.startup();
            //Se construyen todas las ventanas y variables
            lang.hitch(this, this._llamadaConfig());
        },
        // start widget. called by user
        startup: function () {
            if (!this.loaded) {
                // mapa no definido
                if (!this.mapa) {
                    this.destroy();
                    console.log('RiesgoWidget::requiere un mapa');
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
        _updateThemeWatch: function (attr, oldVal, newVal) {
            if (this.get("loaded")) {
                domClass.remove(this.domNode, oldVal);
                domClass.add(this.domNode, newVal);
            }
        },
        _init: function () {
            this._visible();
            this._initDibujo();
            this._activar();
            this.set("loaded", true);
            this.emit("load", {});
        },
        _activar: function () {
            this.emit("active-changed");
            if (this.get("active")) {
                if (this.terminoConstruccion) {
                    if (this._resultadoRiesgoAmbiental && domAttr.get(this._resultadoRiesgoAmbiental, "innerHTML") === this._etiqDialogReporte.marcarPunto) {
                        domAttr.set(this._resultadoRiesgoAmbiental, "innerHTML", '');
                    }
                    if (this._resultadoRiesgoGeo && domAttr.get(this._resultadoRiesgoGeo, "innerHTML") === this._msjMarcarUbicacion) {
                        domAttr.set(this._resultadoRiesgoGeo, "innerHTML", '');
                    }
                    domStyle.set(this._msjUsuarioMarcarUbicacion, 'display', 'none');
                    domStyle.set(this._riesgoNode, 'display', 'block');
                    this.resize();
                }
                this._cg3sr.agregarMapa(this.mapa);
            } else {
                this._dibujo.desactivar();
                this._cg3sr.removerMapa();
            }
        },
        _dibujoEnabledChanged: function () {
            this.emit("dibujo-enabled-changed", {});
        },
        _llamadaConfig: function () {
            var paramConfig = {"Entrada": this._gpRiesgoConfig};
            this._standby.show();
            this._gp.submitJob(paramConfig, lang.hitch(this, this._completeCallbackConfig), lang.hitch(this, this._statusCallback));
        },
        _completeCallbackConfig: function (jobInfo) {
            this._gp.getResultData(jobInfo.jobId, this._gpRiesgoSalida, lang.hitch(this, this._construirVentanas));
            this._standby.hide();
        },
        _statusCallback: function () {
            return null;
        },
        _letraBackground: function (letra) {
            var verde, amarillo, naranja, rojo, gris, color;
            verde = this._gpColores.verde;
            amarillo = this._gpColores.amarillo;
            naranja = this._gpColores.naranja;
            rojo = this._gpColores.rojo;
            gris = this._gpColores.gris;
            color = gris;
            switch (letra) {
            case 'A':
                color = rojo;
                break;
            case 'a':
                color = rojo;
                break;
            case 'aA':
                color = rojo;
                break;
            case 'aM':
                color = amarillo;
                break;
            case 'aB':
                color = amarillo;
                break;
            case 'M':
                color = amarillo;
                break;
            case 'm':
                color = amarillo;
                break;
            case 'mA':
                color = naranja;
                break;
            case 'mM':
                color = amarillo;
                break;
            case 'mB':
                color = verde;
                break;
            case 'B':
                color = verde;
                break;
            case 'b':
                color = verde;
                break;
            case 'bA':
                color = naranja;
                break;
            case 'bM':
                color = verde;
                break;
            case 'bB':
                color = verde;
                break;
            case 'Inicial':
                color = gris;
                break;
            case '':
                color = gris;
                break;
            }
            return color;
        },
        _construirVentanas: function (result) {
            var nodeAyuda, nodeAyudaTexto, mA, node, i, objAlto,
                botonMarcar, botonDesmarcar, nodeBoton,
                botonReporte, nodeTituloPred, botonIrVariableAmbiental,
                nodeTituloGeo, divBotones, nodeImgAmbiental,
                divBM, divBD, normativa, nodeAyuda3, ayuda, nodeNombreT,
                nodeAGGE, etiqueta;

            this._count = 0;
            this._features = [];
            this._archivoJSON = result.value;
            this._tabContainer = new TabContainer({
                style: "height: 520px; width: 720px;"
            }, this._riesgoTabContainerNode);

            //Inicializacion de variables
            this._comboBoxesN = [];
            this._comboBoxes2S = [];
            this._matrices = [];
            this._resultadoVariablesEtiquetas = [];
            this._pestanas = [];

            // Matriz tambo es la 0
            mA = this._archivoJSON.Herramienta.MatrizAmbiental[0];
            this._matrizSeleccionadaString = mA.Id;
            //Cargo las variables de la matriz ambiental                                    
            this._riesgoPredial = mA.RiesgoPredial;
            this._riesgoGeo = mA.RiesgoGeo;
            this._resultadoVariablesEtiquetas.push('');

            arrayUtil.forEach(this._archivoJSON.Herramienta.RiesgoPredial, lang.hitch(this, function (rP) {
                if (rP.Id === this._riesgoPredial) {
                    this._riesgoPredialVar = rP.Variables;
                }
            }));
            arrayUtil.forEach(this._archivoJSON.Herramienta.RiesgoGeo, lang.hitch(this, function (rG) {
                if (rG.Id === this._riesgoGeo) {
                    this._riesgoGeoVar = rG.Variables;
                }
            }));
            this._variablesN = [];
            this._ValorTexto = [];
            this._storeValorTexto = [];
            //Termina de inicializar las variables

            // Creo la ventana de Riesgo Predial            
            node = domConst.create("div");
            nodeTituloPred = domConst.toDom("<div>" + "</div>");
            domConst.place(nodeTituloPred, node);
            domClass.add(nodeTituloPred, "riesgoTitulo");
            i = 0;
            //Itero sobre las variables N
            arrayUtil.forEach(this._archivoJSON.Herramienta.VariableN, lang.hitch(this, function (varN) {
                var primero, divEtiqueta, divCombo, comboBox, posicion, lugar;
                if (arrayUtil.indexOf(this._riesgoPredialVar.Id, varN.Id) !== -1) {
                    this._variablesN.push({etiq: varN.Etiqueta, id: varN.Id, vt: varN.ValorTexto});
                    this._ValorTexto = [];
                    primero = false;
                    posicion = 0;
                    arrayUtil.forEach(this._archivoJSON.Herramienta.VariableN, lang.hitch(this, function (varN2) {
                        if (varN2.Id === varN.Id) {
                            lugar = posicion;
                        }
                        posicion = posicion + 1;
                    }));

                    arrayUtil.forEach(varN.ValorTexto, lang.hitch(this, function (vN) {
                        if (!primero) {
                            primero = true;
                            this._primerTexto = vN.Texto;
                        }
                        this._ValorTexto.push({id: this._archivoJSON.Herramienta.VariableN[lugar].Id, texto: vN.Texto, valor: vN.Valor});
                    }));

                    this._storeValorTexto.push(new Memory({data: this._ValorTexto}));

                    divEtiqueta = domConst.toDom('<div></div>');
                    //divEtiqueta = domConst.create("div", { innerHTML: varN.Etiqueta});
                    domClass.add(divEtiqueta, "riesgoEtiqCombo");
                    etiqueta = domConst.toDom('<div style="float:left;width: 500px;"><a href="#">' + varN.Etiqueta + '</a></div>');
                    domConst.place(etiqueta, divEtiqueta);
                    divCombo = domConst.create("div");
                    comboBox = new ComboBox({
                        value: "",
                        store: this._storeValorTexto[i],
                        searchAttr: "texto",
                        onChange: lang.hitch(this, function () {
                            lang.hitch(this, this._cambioValorComboN(mA.Id));
                        }),
                        style: {width: '160px'}
                    });
                    comboBox.placeAt(divCombo);
                    domClass.add(divCombo, "riesgoComboBox");
                    domConst.place(divCombo, divEtiqueta);
                    domConst.place(divEtiqueta, node);
                    this._comboBoxesN.push({combo: comboBox, etiqueta: varN.Etiqueta, id: varN.Id });
                    i = i + 1;
                }
            }));

            this._resultadoRiesgoPredial = domConst.create("div", { innerHTML: ""});
            domConst.place(this._resultadoRiesgoPredial, node);
            domClass.add(this._resultadoRiesgoPredial, "riesgoResultado");

            //Se inicializa en Alto el riesgo predial                                
            objAlto = {"value": ''};
            lang.hitch(this, this._setearRiesgoPredial(objAlto));

            nodeBoton = domConst.create("div");
            domClass.add(nodeBoton, "riesgoBotonesCentrado");
            botonIrVariableAmbiental = new Button({
                showLabel: true,
                label: "Calcular riesgo ambiental",
                onClick: lang.hitch(this, function () {
                    lang.hitch(this, this._irRiesgoAmbiental("1"));
                })
            });

            botonIrVariableAmbiental.placeAt(nodeBoton);
            domConst.place(nodeBoton, node);

            nodeAGGE = domConst.toDom("<div style='margin-left:10px;margin-bottom:10px;margin-right:10px'> <p>" + this._defAGGE + "</p> </div>");
            domConst.place(nodeAGGE, node);

            this._nodeChild = new ContentPane({
                title: mA.Pestanas[0].Nombre,
                iconClass: "iconVentana",
                content: node
            });
            this._pestanas.push(this._nodeChild);
            this._tabContainer.addChild(this._nodeChild);

            // Creo la ventana de Riesgo geografico
            node = domConst.create("div");
            nodeTituloGeo = domConst.toDom("<div>" + "</div>");
            domConst.place(nodeTituloGeo, node);
            domClass.add(nodeTituloGeo, "riesgoTitulo");

            this._advertenciaRiesgoGeo = domConst.create("div");
            domClass.add(this._advertenciaRiesgoGeo, "riesgoAdvertencia");
            domConst.place(this._advertenciaRiesgoGeo, node);

            //Itero sobre las variables Variable2C
            arrayUtil.forEach(this._archivoJSON.Herramienta.Variable2C, lang.hitch(this, function (var2C) {
                if ((arrayUtil.indexOf(this._riesgoGeoVar.Id, var2C.Id) !== -1)) {
                    //Agrego la variable J que es la de usuario
                    this._riesgoGeoVar.Id.push(var2C.VariableJ);
                    this._riesgoGeoVar.Id.push(var2C.VariableI);
                }
            }));

            this._variables2S = [];

            //Itero sobre las variables Variable2S
            arrayUtil.forEach(this._archivoJSON.Herramienta.Variable2S, lang.hitch(this, function (var2S) {
                var divEtiqueta, divCombo, comboBox, primero, params2S, posicion, lugar;
                if ((arrayUtil.indexOf(this._riesgoGeoVar.Id, var2S.Id) !== -1) && (var2S.Consulta === "Usuario")) {
                    this._variables2S.push({etiq: var2S.Etiqueta, id: var2S.Id, vt: var2S.ValorTexto});
                    this._ValorTexto = [];
                    posicion = 0;

                    arrayUtil.forEach(this._archivoJSON.Herramienta.Variable2S, lang.hitch(this, function (var2S3) {
                        if (var2S3.Id === var2S.Id) {
                            lugar = posicion;
                        }
                        posicion = posicion + 1;
                    }));

                    primero = false;
                    arrayUtil.forEach(var2S.ValorTexto, lang.hitch(this, function (vS) {
                        if (!primero) {
                            primero = true;
                            this._primerTexto = vS.Texto;
                        }
                        this._ValorTexto.push({id: this._archivoJSON.Herramienta.Variable2S[lugar].Id, texto: vS.Texto, valor: vS.Valor});
                    }));

                    this._storeValorTexto.push(new Memory({data: this._ValorTexto}));

                    divEtiqueta = domConst.toDom('<div></div>');
                    //divEtiqueta = domConst.create("div", { innerHTML: varN.Etiqueta});
                    domClass.add(divEtiqueta, "riesgoEtiqCombo");
                    etiqueta = domConst.toDom('<div style="float:left;width: 500px;"><a href="#">' + var2S.Etiqueta + '</a></div>');
                    domConst.place(etiqueta, divEtiqueta);

                    divCombo = domConst.create("div");
                    params2S = {
                        value: "",
                        store: this._storeValorTexto[i],
                        searchAttr: "texto",
                        onChange: lang.hitch(this, function () {
                            lang.hitch(this, this._cambioValorCombo2S(mA.Id, params2S));
                        }),
                        style: {width: '160px'}
                    };

                    comboBox = new ComboBox(params2S);
                    comboBox.placeAt(divCombo);
                    domClass.add(divCombo, "riesgoComboBox");
                    domConst.place(divCombo, divEtiqueta);
                    domConst.place(divEtiqueta, node);

                    i = i + 1;
                    this._comboBoxes2S.push({combo: comboBox, etiqueta: var2S.Etiqueta, id: var2S.Id, consulta: var2S.Consulta});
                }
            }));

            //Itero sobre las variables Variable2S
            arrayUtil.forEach(this._archivoJSON.Herramienta.Variable2S, lang.hitch(this, function (var2S) {
                var divEtiqueta, divCombo, comboBox, primero, params, posicion, lugar, tooltip;
                if ((arrayUtil.indexOf(this._riesgoGeoVar.Id, var2S.Id) !== -1) && (var2S.Consulta === "Capa")) {
                    this._variables2S.push({etiq: var2S.Etiqueta, id: var2S.Id, vt: var2S.ValorTexto});
                    this._ValorTexto = [];
                    primero = false;
                    posicion = 0;
                    arrayUtil.forEach(this._archivoJSON.Herramienta.Variable2S, lang.hitch(this, function (var2S2) {
                        if (var2S2.Id === var2S.Id) {
                            lugar = posicion;
                        }
                        posicion = posicion + 1;
                    }));
                    arrayUtil.forEach(var2S.ValorTexto, lang.hitch(this, function (vS) {
                        if (!primero) {
                            primero = true;
                            this._primerTexto = vS.Texto;
                        }
                        this._ValorTexto.push({id: this._archivoJSON.Herramienta.Variable2S[lugar].Id, texto: vS.Texto, valor: vS.Valor});
                    }));

                    this._storeValorTexto.push(new Memory({data: this._ValorTexto}));

                    divEtiqueta = domConst.create("div");
                    domClass.add(divEtiqueta, "riesgoEtiqCombo");
                    etiqueta = domConst.toDom('<div style="float:left;width: 500px;"><a href="#">' + var2S.Etiqueta + '</a></div>');
                    domConst.place(etiqueta, divEtiqueta);
                    divCombo = domConst.create("div");
                    params = {
                        value: this._primerTexto,
                        store: this._storeValorTexto[i],
                        searchAttr: "texto",
                        style: {width: '160px'}
                    };
                    if (var2S.Consulta !== "Usuario") {
                        params.disabled = "disabled";
                        params.value = "Automático";
                    }
                    comboBox = new ComboBox(params);
                    comboBox.placeAt(divCombo);
                    domClass.add(divCombo, "riesgoComboBox");
                    domConst.place(divCombo, divEtiqueta);
                    domConst.place(divEtiqueta, node);

                    // Create a new Tooltip
                    tooltip = new Tooltip({
                        label: comboBox.value,
                        connectId: divCombo
                    });

                    i = i + 1;
                    this._comboBoxes2S.push({combo: comboBox, etiqueta: var2S.Etiqueta, id: var2S.Id, consulta: var2S.Consulta, tip: tooltip});
                }
            }));

            this._variables2C = [];
            this._comboBoxes2C = [];

            //Itero sobre las variables Variable2C
            arrayUtil.forEach(this._archivoJSON.Herramienta.Variable2C, lang.hitch(this, function (var2C) {
                var divEtiqueta, divCombo, comboBox, primero, params, posicion, lugar, tooltip;
                if ((arrayUtil.indexOf(this._riesgoGeoVar.Id, var2C.Id) !== -1)) {
                    this._variables2C.push({etiq: var2C.Etiqueta, id: var2C.Id, vt: var2C.ValorTexto});
                    this._ValorTexto = [];
                    primero = false;
                    posicion = 0;
                    arrayUtil.forEach(this._archivoJSON.Herramienta.Variable2C, lang.hitch(this, function (var2C2) {
                        if (var2C2.Id === var2C.Id) {
                            lugar = posicion;
                        }
                        posicion = posicion + 1;
                    }));
                    arrayUtil.forEach(var2C.ValorTexto, lang.hitch(this, function (vS) {
                        if (!primero) {
                            primero = true;
                            this._primerTexto = vS.Texto;
                        }
                        this._ValorTexto.push({id: this._archivoJSON.Herramienta.Variable2C[lugar].Id, texto: vS.Texto, valor: vS.Valor});
                    }));

                    this._storeValorTexto.push(new Memory({data: this._ValorTexto}));

                    divEtiqueta = domConst.create("div");
                    domClass.add(divEtiqueta, "riesgoEtiqCombo");
                    etiqueta = domConst.toDom('<div style="float:left;width: 500px;"><a href="#">' + var2C.Etiqueta + '</a></div>');
                    domConst.place(etiqueta, divEtiqueta);
                    divCombo = domConst.create("div");
                    params = {
                        value: "Automático",
                        store: this._storeValorTexto[i],
                        searchAttr: "texto",
                        style: {width: '160px'},
                        disabled: "disabled"
                    };

                    comboBox = new ComboBox(params);
                    comboBox.placeAt(divCombo);
                    domClass.add(divCombo, "riesgoComboBox");
                    domConst.place(divCombo, divEtiqueta);
                    domConst.place(divEtiqueta, node);

                    tooltip = new Tooltip({
                        label: comboBox.value,
                        connectId: divCombo
                    });
                    i = i + 1;
                    this._comboBoxes2C.push({combo: comboBox, etiqueta: var2C.Etiqueta, id: var2C.Id, consulta: var2C.Consulta, tip: tooltip});
                }
            }));

            this._variables2SN = [];
            this._comboBoxes2SN = [];

            //Itero sobre las variables Variable2C
            arrayUtil.forEach(this._archivoJSON.Herramienta.Variable2S_N, lang.hitch(this, function (var2SN) {
                var divEtiqueta, divCombo, comboBox, primero, params, posicion, lugar, tooltip;
                if ((arrayUtil.indexOf(this._riesgoGeoVar.Id, var2SN.Id) !== -1)) {
                    this._variables2C.push({etiq: var2SN.Etiqueta, id: var2SN.Id, vt: var2SN.ValorTexto});
                    this._ValorTexto = [];
                    primero = false;
                    posicion = 0;
                    arrayUtil.forEach(this._archivoJSON.Herramienta.Variable2S_N, lang.hitch(this, function (var2SN2) {
                        if (var2SN2.Id === var2SN.Id) {
                            lugar = posicion;
                        }
                        posicion = posicion + 1;
                    }));
                    arrayUtil.forEach(var2SN.ValorTexto, lang.hitch(this, function (vS) {
                        if (!primero) {
                            primero = true;
                            this._primerTexto = vS.Texto;
                        }
                        this._ValorTexto.push({id: this._archivoJSON.Herramienta.Variable2S_N[lugar].Id, texto: vS.Texto, valor: vS.Valor});
                    }));

                    this._storeValorTexto.push(new Memory({data: this._ValorTexto}));

                    divEtiqueta = domConst.create("div");
                    domClass.add(divEtiqueta, "riesgoEtiqCombo");
                    etiqueta = domConst.toDom('<div style="float:left;width: 500px;"><a href="#">' + var2SN.Etiqueta + '</a></div>');
                    domConst.place(etiqueta, divEtiqueta);
                    divCombo = domConst.create("div");
                    params = {
                        value: "Automático",
                        store: this._storeValorTexto[i],
                        searchAttr: "texto",
                        style: {width: '160px'},
                        disabled: "disabled"
                    };

                    comboBox = new ComboBox(params);
                    comboBox.placeAt(divCombo);
                    domClass.add(divCombo, "riesgoComboBox");
                    domConst.place(divCombo, divEtiqueta);
                    domConst.place(divEtiqueta, node);

                    tooltip = new Tooltip({
                        label: comboBox.value,
                        connectId: divCombo
                    });

                    i = i + 1;
                    this._comboBoxes2SN.push({combo: comboBox, etiqueta: var2SN.Etiqueta, id: var2SN.Id, consulta: var2SN.Consulta, tip: tooltip});
                }
            }));

            divBotones = domConst.create("div");
            domClass.add(divBotones, "riesgoBotones");

            divBM = domConst.create("div");
            domStyle.set(divBM, "float", "left");
            domStyle.set(divBM, "margin-top", "8px");
            divBD = domConst.create("div");
            domStyle.set(divBD, "float", "left");
            domStyle.set(divBD, "margin-top", "8px");

            //Se crea el boton para marcar la referencia              
            botonMarcar = new Button({
                iconClass: "iconMarcarUbicacion",
                showLabel: true,
                label: this._etiqMarcarUbicacion,
                onClick: lang.hitch(this, function () {
                    lang.hitch(this, this._marcarUbicacion());
                })
            });
            botonMarcar.placeAt(divBM);
            domConst.place(divBM, divBotones);

            //Se crea el boton para desmarcar la referencia
            botonDesmarcar = new Button({
                iconClass: "iconCancelarAgregar",
                showLabel: true,
                label: this._etiqDesmarcarUbicacion,
                onClick: lang.hitch(this, function () {
                    lang.hitch(this, this._desmarcarUbicacion(mA.Id));
                })
            });
            botonDesmarcar.placeAt(divBD);

            domConst.place(divBD, divBotones);
            domConst.place(divBotones, node);

            this._resultadoRiesgoGeo = domConst.create("div", { innerHTML: ""});
            domConst.place(this._resultadoRiesgoGeo, node);
            domStyle.set(this._resultadoRiesgoGeo, "backgroundColor", this._letraBackground('Inicial'));
            domClass.add(this._resultadoRiesgoGeo, "riesgoResultado");

            nodeBoton = domConst.create("div");
            domStyle.set(nodeBoton, "text-align", "center");
            domStyle.set(nodeBoton, "margin-top", "10px");
            botonIrVariableAmbiental = new Button({
                showLabel: true,
                label: "Calcular riesgo ambiental",
                onClick: lang.hitch(this, function () {
                    lang.hitch(this, this._irRiesgoAmbiental("2"));
                })
            });
            botonIrVariableAmbiental.placeAt(nodeBoton);
            domConst.place(nodeBoton, node);

            nodeAGGE = domConst.toDom("<div style='margin-left:10px;margin-bottom:10px;margin-right:10px'> <p>" + this._defAGGE + "</p> </div>");
            domConst.place(nodeAGGE, node);

            //Agrego la ventana
            this._nodeChild = new ContentPane({
                title: mA.Pestanas[1].Nombre,
                iconClass: "iconVentana",
                content: node
            });
            this._pestanas.push(this._nodeChild);
            this._tabContainer.addChild(this._nodeChild);

            // Pestana riesgo ambiental
            node = domConst.create("div");

            nodeImgAmbiental = domConst.toDom("<div><img src=\"../js/snia/img/matrizRiesgoAmbiental.png\" /></div>");
            domClass.add(nodeImgAmbiental, "riesgoImg");
            domConst.place(nodeImgAmbiental, node);

            this._resultadoRiesgoAmbiental = domConst.create("div", { innerHTML: ""});
            domConst.place(this._resultadoRiesgoAmbiental, node);
            domStyle.set(this._resultadoRiesgoAmbiental, "backgroundColor", this._letraBackground('Inicial'));
            domClass.add(this._resultadoRiesgoAmbiental, "riesgoResultado");

            nodeBoton = domConst.create("div");
            domClass.add(nodeBoton, "riesgoBotonesCentrado");
            botonReporte = new Button({
                label: this._etiqReporte,
                iconClass: "iconReporte",
                showLabel: true,
                onClick: lang.hitch(this, function () {
                    lang.hitch(this, this._generarReporte(mA.Id));
                })
            });
            botonReporte.placeAt(nodeBoton);
            domConst.place(nodeBoton, node);

            //Agrego la ventana
            this._nodeChild = new ContentPane({
                title: mA.Pestanas[2].Nombre,
                iconClass: "iconVentana",
                content: node
            });
            this._pestanas.push(this._nodeChild);
            this._tabContainer.addChild(this._nodeChild);

            // Pestana Objetivos
            node = domConst.create("div");
            //Itero sobre los objetivos
            arrayUtil.forEach(mA.Informacion.Objetivos, lang.hitch(this, function (objetivo) {
                var nodeTituloObjetivo, nodeTextoObjetivo, nodeLista;
                if (objetivo.Nombre) {
                    nodeTituloObjetivo = domConst.toDom("<div>" + objetivo.Nombre + "</div>");
                    domClass.add(nodeTituloObjetivo, "riesgoTitulo");
                    domConst.place(nodeTituloObjetivo, node);
                }
                if (objetivo.Texto) {
                    nodeTextoObjetivo = domConst.toDom("<div>" + objetivo.Texto + "</div>");
                    domClass.add(nodeTextoObjetivo, "riesgoObjetivo");
                    domConst.place(nodeTextoObjetivo, node);
                }
                nodeLista = domConst.create("ul", null);
                if (objetivo.Puntos) {
                    arrayUtil.forEach(objetivo.Puntos, lang.hitch(this, function (punto) {
                        domConst.create("li", { innerHTML: punto.Texto }, nodeLista);
                    }));
                }
                domConst.place(nodeLista, node);
            }));
            //Agrego la ventana            
            this._nodeChild = new ContentPane({
                title: mA.Pestanas[3].Nombre,
                iconClass: "iconVentana",
                content: node
            });
            this._pestanas.push(this._nodeChild);
            this._tabContainer.addChild(this._nodeChild);

            // Pestana Normativa
            node = domConst.create("div");
            normativa = mA.Informacion.Seccion[3];
            arrayUtil.forEach(normativa.NombreValorTexto, lang.hitch(this, function (nvtJson) {
                var nodeSeccion, nodeNombre, nodeTexto, nodeValor;
                nodeSeccion = domConst.create("div");
                if (nvtJson.Nombre) {
                    nodeNombre = domConst.toDom("<div>" + nvtJson.Nombre + "</div>");
                    domConst.place(nodeNombre, nodeSeccion);
                    domClass.add(nodeNombre, "riesgoNormativaNombre");
                }
                if (nvtJson.Texto) {
                    nodeTexto = domConst.toDom("<div>" + nvtJson.Texto + "</div>");
                    domConst.place(nodeTexto, nodeSeccion);
                    domClass.add(nodeTexto, "riesgoNormativaTexto");
                }
                if (nvtJson.Valor) {
                    nodeValor = domConst.toDom("<div><a href=" + nvtJson.Valor + " target=\"_blank\" >"+nvtJson.Valor+"</a></div>");
                    domConst.place(nodeValor, nodeSeccion);
                    domClass.add(nodeValor, "riesgoNormativaValor");
                }
                domStyle.set(nodeSeccion, "margin-bottom", "10px");
                domConst.place(nodeSeccion, node);
            }));

            //Agrego la ventana
            this._nodeChild = new ContentPane({
                title: mA.Pestanas[4].Nombre,
                iconClass: "iconVentana",
                content: node
            });
            this._pestanas.push(this._nodeChild);
            this._tabContainer.addChild(this._nodeChild);

            // Pestana Ayuda
            node = domConst.create("div");
            domClass.add(node, "riesgoAyuda");
            nodeAyuda = domConst.toDom("<div>" + this._etiqRiesgoAmbiental + "</div>");
            domClass.add(nodeAyuda, "riesgoTitulo");
            domConst.place(nodeAyuda, node);

            nodeAyudaTexto = domConst.toDom("<div>" + this._archivoJSON.Herramienta.Ayuda.texto + "</div>");
            domClass.add(nodeAyudaTexto, "riesgoAyudaTexto");
            domConst.place(nodeAyudaTexto, node);
            for (i = 0; i < 3; i = i + 1) {
                nodeAyuda3 = domConst.toDom("<div></div>");
                domClass.add(nodeAyuda3, "riesgoAyudaNode3");

                ayuda = mA.Informacion.Seccion[i];
                nodeNombreT = domConst.toDom("<div>" + ayuda.Nombre + "</div>");
                domClass.add(nodeNombreT, "riesgoAyudaNombre1");
                domConst.place(nodeNombreT, nodeAyuda3);
                arrayUtil.forEach(ayuda.NombreValorTexto, lang.hitch(this, function (ay) {
                    var nodeNombre, nodeTexto, nodeValor;
                    if (ay.Nombre) {
                        nodeNombre = domConst.toDom("<div>" + ay.Nombre + "</div>");
                        domConst.place(nodeNombre, nodeAyuda3);
                    }
                    if (ay.Texto) {
                        nodeTexto = domConst.toDom("<div>" + ay.Texto + "</div>");
                        domClass.add(nodeTexto, "riesgoAyudaTexto3");
                        domConst.place(nodeTexto, nodeAyuda3);
                    }
                    if (ay.Valor) {
                        nodeValor = domConst.toDom("<div><a href=" + ay.Valor + " target=\"_blank\">(enlace)</a>&nbsp;</div>");
                        domConst.place(nodeValor, nodeAyuda3);
                    }
                }));
                domConst.place(nodeAyuda3, node);
            }

            //Agrego la ventana
            this._nodeChild = new ContentPane({
                title: mA.Pestanas[5].Nombre,
                iconClass: "iconAyuda",
                showLabel: false,
                content: node
            });
            this._pestanas.push(this._nodeChild);
            this._tabContainer.addChild(this._nodeChild);

            this._tabContainer.startup();

            this.terminoConstruccion = true;
            this.resize();
            domStyle.set(this._msjUsuarioMarcarUbicacion, 'display', 'none');
            this.resize();
            on(this._terminoDib, a11yclick, lang.hitch(this, this._terminoDibujo));
            on(this._cancelarDib, a11yclick, lang.hitch(this, this._cancelarDibujo));
            on(this._atrasDib, a11yclick, lang.hitch(this, this._atrasDibujo));
        },
        _cancelarDibujo: function () {
            var c;
            for (c = 0; c < this._count; c = c + 1) {
                this._cg3sr.removerGrafico(c.toString());
            }
            this._count = 0;
            this._puntoGrafico = undefined;
            this._features = undefined;
            this._features = [];
        },
        _atrasDibujo: function () {
            domStyle.set(this._advertenciaRiesgoGeo, "display", "none");
            domStyle.set(this._msjUsuarioMarcarUbicacion, 'display', 'none');

            domStyle.set(this._riesgoNode, 'display', 'block');
            this.resize();
        },
        _terminoDibujo: function (result) {
            var parametrosN, params, parametrosLlamada, esVacio;
            this._destruirDibujo();
            this._cg3sr = result.capaGrafica;
            this._count = result.count;
            esVacio = false;
            parametrosLlamada = this._gpRiesgoGeo + 'Matriz:' + this._matrizSeleccionadaString + ';';
            arrayUtil.forEach(this._comboBoxes2S, lang.hitch(this, function (cb) {
                if (cb.consulta === "Usuario") {
                    parametrosLlamada =  parametrosLlamada + cb.id + ':' + cb.combo.value + ';';
                    if (cb.combo.value.localeCompare("") === 0) {
                        esVacio = true;
                    }
                }
            }));

            parametrosN = '';
            arrayUtil.forEach(this._comboBoxesN, lang.hitch(this, function (cb) {
                parametrosN =  parametrosN + cb.id + ':' + cb.combo.value + ';';
            }));

            params = {"Entrada": parametrosLlamada + "RiesgoPredial:" + domAttr.get(this._resultadoRiesgoPredial, "innerHTML"), "Punto": result.featureSet, "EntradaVariablesN ": parametrosN};
            if (esVacio) {
                domAttr.set(this._resultadoRiesgoGeo, "innerHTML", "Marque opcion en combo");
                domStyle.set(this._resultadoRiesgoGeo, "backgroundColor", this._letraBackground("Inicial"));
                this._standby.hide();
                domStyle.set(this._advertenciaRiesgoGeo, "display", "none");
                domStyle.set(this._msjUsuarioMarcarUbicacion, 'display', 'none');

                domStyle.set(this._riesgoNode, 'display', 'block');
                this.resize();
            } else {

                if (!(((domAttr.get(this._resultadoRiesgoPredial, "innerHTML")) === 'a') ||
                    ((domAttr.get(this._resultadoRiesgoPredial, "innerHTML")) === 'm') ||
                    ((domAttr.get(this._resultadoRiesgoPredial, "innerHTML")) === 'b'))) {
                    this._tabContainer.selectChild(this._pestanas[0]);

                    domAttr.set(this._resultadoRiesgoPredial, "innerHTML", "Marque opcion en combo");
                    domStyle.set(this._resultadoRiesgoPredial, "backgroundColor", this._letraBackground("Inicial"));
                    this._standby.hide();
                    domStyle.set(this._advertenciaRiesgoGeo, "display", "none");
                    domStyle.set(this._msjUsuarioMarcarUbicacion, 'display', 'none');

                    domStyle.set(this._riesgoNode, 'display', 'block');
                    this.resize();
                } else {
                    this._standby.show();
                    this._gp.submitJob(params, lang.hitch(this, this._completeCambioVariableGeo), lang.hitch(this, this._statusCallback));
                }
            }
        },
        _irRiesgoAmbiental: function (pestana) {
            if (((domAttr.get(this._resultadoRiesgoGeo, "innerHTML")) !== '') &&
                    (((domAttr.get(this._resultadoRiesgoGeo, "innerHTML")) !== this._msjMarcarUbicacion))) {
                this._tabContainer.selectChild(this._pestanas[2]);
            } else {
                domStyle.set(this._advertenciaRiesgoGeo, "display", "block");
                if (pestana === "1") {
                    domAttr.set(this._advertenciaRiesgoGeo, "innerHTML", "Por favor completar variables geográficas y marcar AGGE*");
                } else {
                    domAttr.set(this._advertenciaRiesgoGeo, "innerHTML", "Marque el AGGE* en el mapa");
                }
                this._tabContainer.selectChild(this._pestanas[1]);
            }
        },
        _generarReporte: function (matriz) {
            var node, newDiv, titulo, coordenadas, etiquetasPredial,
                etiquetasGeoUsuario, resultadoPredial, etiquetasGeo, c,
                resultadoGeo, resultadoAmbiental, dialogo, capa, extent;
            if (!(((domAttr.get(this._resultadoRiesgoPredial, "innerHTML")) === 'a') ||
                ((domAttr.get(this._resultadoRiesgoPredial, "innerHTML")) === 'm') ||
                ((domAttr.get(this._resultadoRiesgoPredial, "innerHTML")) === 'b'))) {
                this._tabContainer.selectChild(this._pestanas[0]);
            } else if (!(((domAttr.get(this._resultadoRiesgoGeo, "innerHTML")) === 'A') ||
                ((domAttr.get(this._resultadoRiesgoGeo, "innerHTML")) === 'M') ||
                ((domAttr.get(this._resultadoRiesgoGeo, "innerHTML")) === 'B'))) {
                this._tabContainer.selectChild(this._pestanas[1]);
            } else {
                node = domConst.create("div");
                newDiv = domConst.place("<div></div>", node, "after");
                titulo = this._etiqDialogReporte.titulo + ' ' + matriz.substr(6);

                coordenadas = "";
                etiquetasPredial = "";
                arrayUtil.forEach(this._comboBoxesN, lang.hitch(this, function (cb) {
                    etiquetasPredial =  etiquetasPredial + cb.etiqueta + ':' + cb.combo.value + ';';
                }));
                etiquetasGeoUsuario = "";
                arrayUtil.forEach(this._comboBoxes2S, lang.hitch(this, function (cb) {
                    etiquetasGeoUsuario =  etiquetasGeoUsuario + cb.etiqueta + ':' + cb.combo.value + ';';
                }));

                arrayUtil.forEach(this._comboBoxes2C, lang.hitch(this, function (cb) {
                    etiquetasGeoUsuario =  etiquetasGeoUsuario + cb.etiqueta + ':' + cb.combo.value + ';';
                }));

                arrayUtil.forEach(this._comboBoxes2SN, lang.hitch(this, function (cb) {
                    etiquetasGeoUsuario =  etiquetasGeoUsuario + cb.etiqueta + ':' + cb.combo.value + ';';
                }));

                resultadoPredial = domAttr.get(this._resultadoRiesgoPredial, "innerHTML");
                etiquetasGeo = this._resultadoVariablesEtiquetas[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)];
                resultadoGeo = domAttr.get(this._resultadoRiesgoGeo, "innerHTML");
                resultadoAmbiental = domAttr.get(this._resultadoRiesgoAmbiental, "innerHTML");

                capa = this._cg3sr;
                for (c = 0; c < this._count; c = c + 1) {
                    if (c !== 0) {
                        extent = extent.union(capa.getGrafico(c.toString()).grafico(this.mapa.map.spatialReference.wkid).geometry.getExtent());
                    } else {
                        extent = capa.getGrafico("0").grafico(this.mapa.map.spatialReference.wkid).geometry.getExtent();
                    }
                }
                if (extent) {
                    this.mapa.map.setExtent(extent.expand(2));
                }
                // Control de zoom por mapa
                if (((this.mapa.baseMapLayer.url === "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer") || (this.mapa.baseMapLayer.url === "http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer")) && (this.mapa.map.getZoom() > 17)) {
                    this.mapa.map.setZoom(17);
                }
                //Se crea el widget con los parametros
                this._riesgoReporteWidget = new RiesgoReporteWidget({mapa: this.mapa, titulo: titulo, coordenadas: coordenadas,
                    etiquetasPredial: etiquetasPredial, resultadoPredial: resultadoPredial, etiquetasGeo: etiquetasGeo, etiquetasGeoU: etiquetasGeoUsuario, resultadoGeo: resultadoGeo,
                    resultadoAmbiental: resultadoAmbiental, config: this._configWidgetReporte}, newDiv);
                this._riesgoReporteWidget.startup();
                this._riesgoReporteWidget.show();
                dialogo = new Dialog({
                    title : this._etiqDialogReporte.nombre,
                    style : "width: " + this._etiqDialogReporte.width,
                    content: this._riesgoReporteWidget
                });
                dialogo.startup();
                dialogo.show();
            }
        },
        _cambioValorComboN: function (value) {
            var parametrosLlamada, params, esVacio;
            esVacio = false;
            parametrosLlamada = this._gpRiesgoPredial + 'Matriz:' + value + ';';

            arrayUtil.forEach(this._comboBoxesN, lang.hitch(this, function (cb) {
                if (cb.combo.value.localeCompare("") === 0) {
                    esVacio = true;
                }
                parametrosLlamada =  parametrosLlamada + cb.id + ':' + cb.combo.value + ';';
            }));

            params = {"Entrada": parametrosLlamada};
            if (((domAttr.get(this._resultadoRiesgoGeo, "innerHTML")) !== '')
                    && ((domAttr.get(this._resultadoRiesgoGeo, "innerHTML")) !== this._msjMarcarUbicacion)) {
                params = {"Entrada": parametrosLlamada + 'RiesgoGeo:' + domAttr.get(this._resultadoRiesgoGeo, "innerHTML")};
            }
            if (esVacio) {
                domAttr.set(this._resultadoRiesgoPredial, "innerHTML", "Marque todos los combos");
                domStyle.set(this._resultadoRiesgoPredial, "backgroundColor", this._letraBackground("Inicial"));
            } else {
                this._standby.show();
                this._gp.submitJob(params, lang.hitch(this, this._completeCambioVariable), lang.hitch(this, this._statusCallback));
            }
        },
        _setearRiesgoAmbiental: function (result) {
            domAttr.set(this._resultadoRiesgoAmbiental, "innerHTML", result.value);
            domStyle.set(this._resultadoRiesgoAmbiental, "backgroundColor", this._letraBackground(result.value));
            this._standby.hide();
        },
        _completeCambioVariable: function (jobInfo) {
            this._gp.getResultData(jobInfo.jobId, this._gpRiesgoSalida, lang.hitch(this, this._setearRiesgoPredial));
            this._gp.getResultData(jobInfo.jobId, this._gpRiesgoSalidaAmbiental, lang.hitch(this, this._setearRiesgoAmbiental));
        },
        _setearRiesgoPredial: function (result) {
            domAttr.set(this._resultadoRiesgoPredial, "innerHTML", result.value);
            domStyle.set(this._resultadoRiesgoPredial, "backgroundColor", this._letraBackground(result.value));
        },
        _cambioValorCombo2S: function (value, value2) {
            var parametrosLlamada, params, features, featureSet, parametrosN, esVacio;
            esVacio = false;
            parametrosLlamada = this._gpRiesgoGeo + 'Matriz:' + value + ';';
            arrayUtil.forEach(this._comboBoxes2S, lang.hitch(this, function (cb) {
                if (cb.consulta === "Usuario") {
                    parametrosLlamada =  parametrosLlamada + cb.id + ':' + cb.combo.value + ';';
                    if (cb.combo.value.localeCompare("") === 0) {
                        esVacio = true;
                    }
                }
            }));

            if (this._puntoGrafico) {
                features = [];
                features.push(this._puntoGrafico);
                featureSet = new FeatureSet();
                featureSet.features = features;

                parametrosN = '';
                arrayUtil.forEach(this._comboBoxesN, lang.hitch(this, function (cb) {
                    parametrosN =  parametrosN + cb.id + ':' + cb.combo.value + ';';
                }));

                params = {"Entrada": parametrosLlamada + "RiesgoPredial:" + domAttr.get(this._resultadoRiesgoPredial, "innerHTML"), "Punto": featureSet, "EntradaVariablesN": parametrosN};

                if (esVacio) {
                    domAttr.set(this._resultadoRiesgoGeo, "innerHTML", "Marque los combos");
                    domStyle.set(this._resultadoRiesgoGeo, "backgroundColor", this._letraBackground("Inicial"));
                } else {
                    this._standby.show();
                    this._gp.submitJob(params, lang.hitch(this, this._completeCambioVariableGeo), lang.hitch(this, this._statusCallback));
                }
            } else {
                domAttr.set(this._resultadoRiesgoGeo, "innerHTML", this._msjMarcarUbicacion);
            }
        },
        _completeCambioVariableGeo: function (jobInfo) {
            this._gp.getResultData(jobInfo.jobId, this._gpRiesgoSalida, lang.hitch(this, this._setearRiesgoGeografico));
            this._gp.getResultData(jobInfo.jobId, this._gpRiesgoSalidaAmbiental, lang.hitch(this, this._setearRiesgoAmbiental));
            this._gp.getResultData(jobInfo.jobId, this._gpRiesgoSalidaVarEtiq, lang.hitch(this, this._setearVariablesEtiquetas));
            this._standby.hide();
            domStyle.set(this._advertenciaRiesgoGeo, "display", "none");
            domStyle.set(this._msjUsuarioMarcarUbicacion, 'display', 'none');

            domStyle.set(this._riesgoNode, 'display', 'block');
            this.resize();
        },
        _setearRiesgoGeografico: function (result) {
            domAttr.set(this._resultadoRiesgoGeo, "innerHTML", result.value);
            domStyle.set(this._resultadoRiesgoGeo, "backgroundColor", this._letraBackground(result.value));
        },
        _setearVariablesEtiquetas: function (result) {
            var etiqValor, etiqueta, valor;

            etiqValor = result.value.split(";");
            arrayUtil.forEach(etiqValor, lang.hitch(this, function (eV) {
                etiqueta = eV.split(":")[0];
                valor = eV.split(":")[1];
                arrayUtil.forEach(this._comboBoxes2S, lang.hitch(this, function (cb2s) {
                    if (etiqueta === cb2s.etiqueta) {
                        cb2s.combo.set('value', valor);
                        if (cb2s.tip) {
                            cb2s.tip.label = valor;
                        }
                    }
                }));
            }));

            // 2C
            arrayUtil.forEach(etiqValor, lang.hitch(this, function (eV) {
                etiqueta = eV.split(":")[0];
                valor = eV.split(":")[1];
                arrayUtil.forEach(this._comboBoxes2C, lang.hitch(this, function (cb2c) {
                    if (etiqueta === cb2c.etiqueta) {
                        cb2c.combo.set('value', valor);
                        if (cb2c.tip) {
                            cb2c.tip.label = valor;
                        }
                    }
                }));
            }));

            // 2SN
            arrayUtil.forEach(etiqValor, lang.hitch(this, function (eV) {
                etiqueta = eV.split(":")[0];
                valor = eV.split(":")[1];
                arrayUtil.forEach(this._comboBoxes2SN, lang.hitch(this, function (cb2sn) {
                    if (etiqueta === cb2sn.etiqueta) {
                        cb2sn.combo.set('value', valor);
                        if (cb2sn.tip) {
                            cb2sn.tip.label = valor;
                        }
                    }
                }));
            }));
            this._resultadoVariablesEtiquetas[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)] = result.value;
        },
        _marcarUbicacion: function () {
            var node, newDiv;
            node = domConst.create("div");
            newDiv = domConst.place("<div></div>", node, "after");
            this._riesgoDibujoWidget = new RiesgoDibujoWidget({mapa: this.mapa}, newDiv);
            this._riesgoDibujoWidget.startup();
            this._riesgoDibujoWidget.show();

            this.dialogoDibujo = new Dialog({
                title : this._etiqDialogReporte.nombre,
                style : "width: " + this._etiqDialogReporte.width,
                content: this._riesgoDibujoWidget
            });
            this.dialogoDibujo.startup();
            this.dialogoDibujo.show();

            this.emit('esconder-dialog', {});
            this._riesgoDibujoWidget.on('invocar-riesgo', lang.hitch(this, this._terminoDibujo));
            this._riesgoDibujoWidget.on('destruir', lang.hitch(this, this._destruirDibujo));

            //domStyle.set(this._msjUsuarioMarcarUbicacion, 'display', 'block');
            //this._dibujo.activar(Draw.POLYGON);
            //this.resize();
        },
        _destruirDibujo: function () {
            this.dialogoDibujo.destroy();
            this.emit('mostrar-dialog', {});
        },
        _initDibujo: function () {
            this._dibujo = new Dibujo();
            this._dibujo.agregarMapa(this.mapa);
            on(this._dibujo, "dibujo-complete", lang.hitch(this, this._dibujoComplete));
            //Capa grafica
            this._cg3sr = new CapaGrafica3SR();
            this._cg3sr.agregarMapa(this.mapa);
        },
        _dibujoComplete: function (evt) {
            var fillSymbol;
            fillSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                    new Color([255, 192, 0]), 1),
                new Color([255, 192, 0, 0.25]));
            this._puntoGrafico = new Graphic(evt.geometry, fillSymbol);
            this._cg3sr.agregarGrafico(this._count.toString(), this._puntoGrafico);
            this._count = this._count + 1;
            this._features.push(this._puntoGrafico);
        },
        _desmarcarUbicacion: function () {
            var c;
            for (c = 0; c < this._count; c = c + 1) {
                this._cg3sr.removerGrafico(c.toString());
            }
            this._count = 0;
            this._dibujo.desactivar();
            this._puntoGrafico = undefined;
            this._features = undefined;
            this._features = [];
            domAttr.set(this._resultadoRiesgoGeo, "innerHTML", '');
            domStyle.set(this._resultadoRiesgoGeo, "backgroundColor", this._letraBackground('Inicial'));
            domAttr.set(this._resultadoRiesgoAmbiental, "innerHTML", '');
            domStyle.set(this._resultadoRiesgoAmbiental, "backgroundColor", this._letraBackground('Inicial'));
        }
    });
    return widget;
});