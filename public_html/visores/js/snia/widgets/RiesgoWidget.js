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
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/Color",
    "dijit/form/Button",
    "esri/tasks/Geoprocessor",
    "esri/tasks/FeatureSet",
    "dojo/dom-attr",
    "dojox/widget/Standby",
    "widgets/RiesgoInformacionWidget",
    "dijit/Dialog",
    "widgets/RiesgoReporteWidget",
    "modulos/Dibujo", "esri/toolbars/draw",
    "modulos/CapaGrafica3SR"
], function (on, Evented, declare, lang,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    template, i18n, a11yclick, domClass, domStyle, ComboBox, TabContainer,
    ContentPane, domConst, arrayUtil, Memory,
    Graphic, SimpleMarkerSymbol, SimpleLineSymbol, Color,
    Button, Geoprocessor, FeatureSet, domAttr, Standby, RiesgoInformacionWidget,
    Dialog, RiesgoReporteWidget, Dibujo, Draw, CapaGrafica3SR
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
                    if (this._resultadoRiesgoAmbiental[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)] && domAttr.get(this._resultadoRiesgoAmbiental[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)], "innerHTML") === this._etiqDialogReporte.marcarPunto) {
                        domAttr.set(this._resultadoRiesgoAmbiental[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)], "innerHTML", '');
                    }
                    if (this._resultadoRiesgoGeo[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)] && domAttr.get(this._resultadoRiesgoGeo[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)], "innerHTML") === this._msjMarcarUbicacion) {
                        domAttr.set(this._resultadoRiesgoGeo[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)], "innerHTML", '');
                    }
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
            case 'AA':
                color = rojo;
                break;
            case 'AM':
                color = amarillo;
                break;
            case 'AB':
                color = amarillo;
                break;
            case 'M':
                color = amarillo;
                break;
            case 'MA':
                color = naranja;
                break;
            case 'MM':
                color = amarillo;
                break;
            case 'MB':
                color = verde;
                break;
            case 'B':
                color = verde;
                break;
            case 'BA':
                color = naranja;
                break;
            case 'BM':
                color = verde;
                break;
            case 'BB':
                color = verde;
                break;
            case 'Inicial':
                color = gris;
                break;
            }
            return color;
        },
        _construirVentanas: function (result) {
            var nodeAyuda, nMatriz, nodeAyudaTexto;
            this._archivoJSON = result.value;
            this._tabContainer = new TabContainer({
                style: "height: 520px; width: 520px;"
            }, this._riesgoTabContainerNode);

            //Inicializacion de variables
            this._comboBoxesN = [];
            this._comboBoxes2S = [];
            this._matrices = [];
            this._puntoGrafico = [];
            this._resultadoRiesgoPredial = [];
            this._resultadoRiesgoGeo = [];
            this._resultadoRiesgoAmbiental = [];
            this._resultadoVariablesEtiquetas = [];
            nMatriz = 0;
            //Itero sobre las matrices ambientales (Matriz tambo, matriz corral)               
            arrayUtil.forEach(this._archivoJSON.Herramienta.MatrizAmbiental, lang.hitch(this, function (mA) {
                var node, i, objAlto, botonMarcar, botonDesmarcar,
                    botonInformacion, botonReporte, nodeTituloPred,
                    nodeTituloGeo, nodeTituloAmbiental, divBotones,
                    divBM, divBD;
                //Cargo las variables de la matriz ambiental                                    
                this._riesgoPredial = mA.RiesgoPredial;
                this._riesgoGeo = mA.RiesgoGeo;
                this._matrizSeleccionadaString = mA.Id;
                this._matrices.push(mA.Id);
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

                //Creacion del div para la variable N
                node = domConst.create("div");
                domConst.place(node, "principal", "before");
                nodeTituloPred = domConst.toDom("<div>" + this._etiqRiesgoPredial + "</div>");
                domClass.add(nodeTituloPred, "riesgoTitulo");
                domConst.place(nodeTituloPred, node);

                i = 0;
                //Itero sobre las variables N 
                arrayUtil.forEach(this._archivoJSON.Herramienta.VariableN, lang.hitch(this, function (varN) {
                    var primero, divEtiqueta, divCombo, comboBox;
                    if (arrayUtil.indexOf(this._riesgoPredialVar.Id, varN.Id) !== -1) {
                        this._variablesN.push({etiq: varN.Etiqueta, id: varN.Id, vt: varN.ValorTexto});
                        this._ValorTexto = [];
                        primero = false;
                        arrayUtil.forEach(varN.ValorTexto, lang.hitch(this, function (vN) {
                            if (!primero) {
                                primero = true;
                                this._primerTexto = vN.Texto;
                            }
                            this._ValorTexto.push({id: this._archivoJSON.Herramienta.VariableN[arrayUtil.indexOf(this._riesgoPredialVar.Id, varN.Id)].Id, texto: vN.Texto, valor: vN.Valor});
                        }));

                        this._storeValorTexto.push(new Memory({data: this._ValorTexto}));

                        divEtiqueta = domConst.create("div", { innerHTML: varN.Etiqueta});
                        domClass.add(divEtiqueta, "riesgoEtiqCombo");
                        divCombo = domConst.create("div");
                        comboBox = new ComboBox({
                            value: this._primerTexto,
                            store: this._storeValorTexto[i],
                            searchAttr: "texto",
                            onChange: lang.hitch(this, function () {
                                lang.hitch(this, this._cambioValorComboN(mA.Id));
                            })
                        });
                        comboBox.placeAt(divCombo);
                        domClass.add(divCombo, "riesgoComboBox");
                        domConst.place(divCombo, divEtiqueta);
                        domConst.place(divEtiqueta, node);

                        this._comboBoxesN.push({combo: comboBox, matriz: mA.Id, etiqueta: varN.Etiqueta, id: varN.Id });
                        i = i + 1;
                    }
                }));

                this._resultadoRiesgoPredial.push(domConst.create("div", { innerHTML: ""}));
                domConst.place(this._resultadoRiesgoPredial[nMatriz], node);
                domClass.add(this._resultadoRiesgoPredial[nMatriz], "riesgoResultado");

                //Se inicializa en Alto el riesgo predial                                
                objAlto = {"value": 'A'};
                lang.hitch(this, this._setearRiesgoPredial(objAlto));

                nodeTituloGeo = domConst.toDom("<div>" + this._etiqRiesgoGeo + "</div>");
                domConst.place(nodeTituloGeo, node);
                domClass.add(nodeTituloGeo, "riesgoTitulo");

                //Itero sobre las variables Variable2C
                arrayUtil.forEach(this._archivoJSON.Herramienta.Variable2C, lang.hitch(this, function (var2C) {
                    if ((arrayUtil.indexOf(this._riesgoGeoVar.Id, var2C.Id) !== -1)) {
                        //Agrego la variable J que es la de usuario
                        this._riesgoGeoVar.Id.push(var2C.VariableJ);
                    }
                }));

                this._variables2S = [];

                //Itero sobre las variables Variable2S
                arrayUtil.forEach(this._archivoJSON.Herramienta.Variable2S, lang.hitch(this, function (var2S) {
                    var divEtiqueta, divCombo, comboBox, primero;
                    if ((arrayUtil.indexOf(this._riesgoGeoVar.Id, var2S.Id) !== -1) && (var2S.Consulta === "Usuario")) {
                        this._variables2S.push({etiq: var2S.Etiqueta, id: var2S.Id, vt: var2S.ValorTexto});
                        this._ValorTexto = [];
                        primero = false;
                        arrayUtil.forEach(var2S.ValorTexto, lang.hitch(this, function (vS) {
                            if (!primero) {
                                primero = true;
                                this._primerTexto = vS.Texto;
                            }
                            this._ValorTexto.push({id: this._archivoJSON.Herramienta.Variable2S[arrayUtil.indexOf(this._riesgoGeoVar.Id, var2S.Id)].Id, texto: vS.Texto, valor: vS.Valor});
                        }));

                        this._storeValorTexto.push(new Memory({data: this._ValorTexto}));

                        divEtiqueta = domConst.create("div", { innerHTML: var2S.Etiqueta});
                        domClass.add(divEtiqueta, "riesgoEtiqCombo");
                        divCombo = domConst.create("div");
                        comboBox = new ComboBox({
                            value: this._primerTexto,
                            store: this._storeValorTexto[i],
                            searchAttr: "texto",
                            onChange: lang.hitch(this, function () {
                                lang.hitch(this, this._cambioValorCombo2S(mA.Id));
                            })
                        });
                        comboBox.placeAt(divCombo);
                        domClass.add(divCombo, "riesgoComboBox");
                        domConst.place(divCombo, divEtiqueta);
                        domConst.place(divEtiqueta, node);

                        i = i + 1;
                        this._comboBoxes2S.push({combo: comboBox, matriz: mA.Id, etiqueta: var2S.Etiqueta, id: var2S.Id});
                    }
                }));

                divBotones = domConst.create("div");
                domClass.add(divBotones, "riesgoBotones");

                divBM = domConst.create("div");
                domStyle.set(divBM, "float", "left");
                divBD = domConst.create("div");
                domStyle.set(divBD, "float", "left");

                //Se crea el boton para marcar la referencia              
                botonMarcar = new Button({
                    iconClass: "iconMarcarUbicacion",
                    showLabel: false,
                    label: this._etiqMarcarUbicacion,
                    onClick: lang.hitch(this, function () {
                        lang.hitch(this, this._marcarUbicacion(mA.Id));
                    })
                });
                botonMarcar.placeAt(divBM);
                domConst.place(divBM, divBotones);

                //Se crea el boton para desmarcar la referencia
                botonDesmarcar = new Button({
                    iconClass: "iconCancelarAgregar",
                    showLabel: false,
                    label: this._etiqDesmarcarUbicacion,
                    onClick: lang.hitch(this, function () {
                        lang.hitch(this, this._desmarcarUbicacion(mA.Id));
                    })
                });
                botonDesmarcar.placeAt(divBD);

                domConst.place(divBD, divBotones);
                domConst.place(divBotones, node);

                this._resultadoRiesgoGeo.push(domConst.create("div", { innerHTML: ""}));
                domConst.place(this._resultadoRiesgoGeo[nMatriz], node);
                domStyle.set(this._resultadoRiesgoGeo[nMatriz], "backgroundColor", this._letraBackground('Inicial'));
                domClass.add(this._resultadoRiesgoGeo[nMatriz], "riesgoResultado");

                nodeTituloAmbiental = domConst.toDom("<div>" + this._etiqRiesgoAmbiental + "</div>");
                domClass.add(nodeTituloAmbiental, "riesgoTitulo");
                domConst.place(nodeTituloAmbiental, node);

                this._resultadoRiesgoAmbiental.push(domConst.create("div", { innerHTML: ""}));
                domConst.place(this._resultadoRiesgoAmbiental[nMatriz], node);
                domStyle.set(this._resultadoRiesgoAmbiental[nMatriz], "backgroundColor", this._letraBackground('Inicial'));
                domClass.add(this._resultadoRiesgoAmbiental[nMatriz], "riesgoResultado");
                //Agrego la ventana
                this._nodeChild = new ContentPane({
                    title: mA.Id,
                    iconClass: "iconVentana",
                    content: node
                });
                this._tabContainer.addChild(this._nodeChild);

                //Se crea el boton de informacion
                botonInformacion = new Button({
                    label: this._etiqInformacion,
                    onClick: lang.hitch(this, function () {
                        lang.hitch(this, this._abrirInformacion(mA.Id));
                    })
                });
                botonInformacion.placeAt(node);

                //Se crea el boton del reporte pdf
                botonReporte = new Button({
                    label: this._etiqReporte,
                    iconClass: "iconReporte",
                    showLabel: false,
                    onClick: lang.hitch(this, function () {
                        lang.hitch(this, this._generarReporte(mA.Id));
                    })
                });
                botonReporte.placeAt(node);
                nMatriz = nMatriz + 1;
            }));

            nodeAyuda = domConst.toDom("<div>" + this._etiqRiesgoAmbiental + "</div>");
            domClass.add(nodeAyuda, "riesgoTitulo");

            nodeAyudaTexto = domConst.toDom("<div> <br>" + this._archivoJSON.Herramienta.Ayuda.texto + "</div>");
            domClass.add(nodeAyudaTexto, "riesgoAyudaTexto");

            domConst.place(nodeAyudaTexto, nodeAyuda);

            //Agrego la ventana
            this._nodeChild = new ContentPane({
                title: this._etiqAyuda,
                iconClass: "iconAyuda",
                showLabel: false,
                content: nodeAyuda
            });
            this._tabContainer.addChild(this._nodeChild);

            this._tabContainer.startup();

            dojo.connect(this._tabContainer, "selectChild", lang.hitch(this, function (child) {
                lang.hitch(this, this._cambiarTabulador(child.title));
            }));

            this.terminoConstruccion = true;
            this.resize();
        },
        _abrirInformacion: function (matriz) {
            var node, newDiv, informacion, dialogo;
            node = domConst.create("div");
            newDiv = domConst.place("<div></div>", node, "after");
            informacion = this._archivoJSON.Herramienta.MatrizAmbiental[arrayUtil.indexOf(this._matrices, matriz)].Informacion;
            this._riesgoInformacionWidget = new RiesgoInformacionWidget({mapa: this.mapa, json: informacion}, newDiv);
            this._riesgoInformacionWidget.startup();
            this._riesgoInformacionWidget.show();
            dialogo = new Dialog({
                title : this._etiqDialogInformacion.titulo + ' ' + this._archivoJSON.Herramienta.MatrizAmbiental[arrayUtil.indexOf(this._matrices, matriz)].Nombre,
                content: this._riesgoInformacionWidget
            });
            dialogo.startup();
            dialogo.show();
        },
        _generarReporte: function (matriz) {
            var node, newDiv, titulo, strX, strY, coordenadas, etiquetasPredial,
                etiquetasGeoUsuario, resultadoPredial, etiquetasGeo,
                resultadoGeo, resultadoAmbiental, dialogo;
            if (this._puntoGrafico[arrayUtil.indexOf(this._matrices, matriz)]) {
                node = domConst.create("div");
                newDiv = domConst.place("<div></div>", node, "after");
                titulo = this._etiqDialogReporte.titulo + ' ' + matriz.substr(6);                
                strX = this._cg3sr._gs[0]._g_utm.geometry.x.toString();
                strY = this._cg3sr._gs[0]._g_utm.geometry.y.toString();
//              strX = this._puntoGrafico[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)].geometry.x.toString();
//              strY = this._puntoGrafico[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)].geometry.y.toString();
                coordenadas = strX.substring(0, strX.indexOf(".") + 3) + '; ' + strY.substring(0, strY.indexOf(".") + 3);

                etiquetasPredial = '';
                arrayUtil.forEach(this._comboBoxesN, lang.hitch(this, function (cb) {
                    if (cb.matriz === matriz) {
                        etiquetasPredial =  etiquetasPredial + cb.etiqueta + ':' + cb.combo.value + ';';
                    }
                }));
                etiquetasGeoUsuario = '';
                arrayUtil.forEach(this._comboBoxes2S, lang.hitch(this, function (cb) {
                    if (cb.matriz === matriz) {
                        etiquetasGeoUsuario =  etiquetasGeoUsuario + cb.etiqueta + ':' + cb.combo.value + ';';
                    }
                }));

                resultadoPredial = domAttr.get(this._resultadoRiesgoPredial[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)], "innerHTML");
                etiquetasGeo = this._resultadoVariablesEtiquetas[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)];
                resultadoGeo = domAttr.get(this._resultadoRiesgoGeo[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)], "innerHTML");
                resultadoAmbiental = domAttr.get(this._resultadoRiesgoAmbiental[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)], "innerHTML");

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
            } else {
                lang.hitch(this, this._marcarUbicacion(matriz));
                domAttr.set(this._resultadoRiesgoAmbiental[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)], "innerHTML", this._etiqDialogReporte.marcarPunto);
            }
        },
        _cambiarTabulador: function (matriz) {
            this._matrizSeleccionadaString = matriz;
            arrayUtil.forEach(this._matrices, lang.hitch(this, function (m) {
                if (this._matrizSeleccionadaString === m) {
                    if (this._puntoGrafico[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)]) {
                        this._cg3sr.agregarGrafico([arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)], this._puntoGrafico[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)]);
                    }
                } else {
                    this._cg3sr.removerGrafico([arrayUtil.indexOf(this._matrices, m)]);
                }
            }));
        },
        _cambioValorComboN: function (value) {
            var parametrosLlamada, params;
            parametrosLlamada = this._gpRiesgoPredial + 'Matriz:' + value + ';';
            this._matrizSeleccionadaString = value;
            arrayUtil.forEach(this._comboBoxesN, lang.hitch(this, function (cb) {
                if (cb.matriz === value) {
                    parametrosLlamada =  parametrosLlamada + cb.id + ':' + cb.combo.value + ';';
                }
            }));

            params = {"Entrada": parametrosLlamada};
            if (((domAttr.get(this._resultadoRiesgoGeo[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)], "innerHTML")) !== '')
                    && ((domAttr.get(this._resultadoRiesgoGeo[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)], "innerHTML")) !== this._msjMarcarUbicacion)) {
                params = {"Entrada": parametrosLlamada + 'RiesgoGeo:' + domAttr.get(this._resultadoRiesgoGeo[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)], "innerHTML")};
            }
            this._standby.show();
            this._gp.submitJob(params, lang.hitch(this, this._completeCambioVariable), lang.hitch(this, this._statusCallback));
        },
        _setearRiesgoAmbiental: function (result) {
            domAttr.set(this._resultadoRiesgoAmbiental[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)], "innerHTML", result.value);
            domStyle.set(this._resultadoRiesgoAmbiental[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)], "backgroundColor", this._letraBackground(result.value));
            this._standby.hide();
        },
        _completeCambioVariable: function (jobInfo) {
            this._gp.getResultData(jobInfo.jobId, this._gpRiesgoSalida, lang.hitch(this, this._setearRiesgoPredial));
            this._gp.getResultData(jobInfo.jobId, this._gpRiesgoSalidaAmbiental, lang.hitch(this, this._setearRiesgoAmbiental));
        },
        _setearRiesgoPredial: function (result) {
            domAttr.set(this._resultadoRiesgoPredial[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)], "innerHTML", result.value);
            domStyle.set(this._resultadoRiesgoPredial[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)], "backgroundColor", this._letraBackground(result.value));
        },
        _cambioValorCombo2S: function (value) {
            var parametrosLlamada, params, features, featureSet;
            parametrosLlamada = this._gpRiesgoGeo + 'Matriz:' + value + ';';
            arrayUtil.forEach(this._comboBoxes2S, lang.hitch(this, function (cb) {
                if (cb.matriz === value) {
                    parametrosLlamada =  parametrosLlamada + cb.id + ':' + cb.combo.value + ';';
                }
            }));
            this._matrizSeleccionadaString = value;

            if (this._puntoGrafico[arrayUtil.indexOf(this._matrices, value)]) {
                features = [];
                features.push(this._puntoGrafico[arrayUtil.indexOf(this._matrices, value)]);
                featureSet = new FeatureSet();
                featureSet.features = features;
                params = {"Entrada": parametrosLlamada + "RiesgoPredial:" + domAttr.get(this._resultadoRiesgoPredial[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)], "innerHTML"), "Punto": featureSet};
                this._standby.show();
                this._gp.submitJob(params, lang.hitch(this, this._completeCambioVariableGeo), lang.hitch(this, this._statusCallback));
            } else {
                domAttr.set(this._resultadoRiesgoGeo[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)], "innerHTML", this._msjMarcarUbicacion);
                this._marcarUbicacion(this._matrizSeleccionadaString);
            }
        },
        _completeCambioVariableGeo: function (jobInfo) {
            this._gp.getResultData(jobInfo.jobId, this._gpRiesgoSalida, lang.hitch(this, this._setearRiesgoGeografico));
            this._gp.getResultData(jobInfo.jobId, this._gpRiesgoSalidaAmbiental, lang.hitch(this, this._setearRiesgoAmbiental));
            this._gp.getResultData(jobInfo.jobId, this._gpRiesgoSalidaVarEtiq, lang.hitch(this, this._setearVariablesEtiquetas));
            this._standby.hide();
        },
        _setearRiesgoGeografico: function (result) {
            domAttr.set(this._resultadoRiesgoGeo[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)], "innerHTML", result.value);
            domStyle.set(this._resultadoRiesgoGeo[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)], "backgroundColor", this._letraBackground(result.value));
        },
        _setearVariablesEtiquetas: function (result) {
            this._resultadoVariablesEtiquetas[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)] = result.value;
        },
        _marcarUbicacion: function (matriz) {
            this._matrizSeleccionadaString = matriz;
            this._dibujo.activar(Draw.POINT);
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
            var parametrosLlamada, features, featureSet, params,
                markerSymbol;
            markerSymbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CROSS, 10,
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                        new Color([0, 0, 0]), 1),
                    new Color([0, 0, 0, 0.25]));
            this._dibujo.desactivar();
            if (this._puntoGrafico[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)]) {
                this._puntoGrafico[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)] = undefined;
                this._cg3sr.removerGrafico([arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)]);
            }
            this._puntoGrafico[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)] = new Graphic(evt.geometry, markerSymbol);
            this._cg3sr.agregarGrafico([arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)], this._puntoGrafico[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)]);

            parametrosLlamada = this._gpRiesgoGeo + 'Matriz:' + this._matrizSeleccionadaString + ';';
            arrayUtil.forEach(this._comboBoxes2S, lang.hitch(this, function (cb) {
                if (cb.matriz === this._matrizSeleccionadaString) {
                    parametrosLlamada =  parametrosLlamada + cb.id + ':' + cb.combo.value + ';';
                }
            }));
            features = [];
            features.push(this._puntoGrafico[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)]);
            featureSet = new FeatureSet();
            featureSet.features = features;
            params = {"Entrada": parametrosLlamada + "RiesgoPredial:" + domAttr.get(this._resultadoRiesgoPredial[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)], "innerHTML"), "Punto": featureSet};
            this._standby.show();
            this._gp.submitJob(params, lang.hitch(this, this._completeCambioVariableGeo), lang.hitch(this, this._statusCallback));
        },
        _desmarcarUbicacion: function (matriz) {
            this._cg3sr.removerGrafico([arrayUtil.indexOf(this._matrices, matriz)]);
            this._dibujo.desactivar();
            this._puntoGrafico[arrayUtil.indexOf(this._matrices, matriz)] = undefined;
            domAttr.set(this._resultadoRiesgoGeo[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)], "innerHTML", '');
            domStyle.set(this._resultadoRiesgoGeo[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)], "backgroundColor", this._letraBackground('Inicial'));
            domAttr.set(this._resultadoRiesgoAmbiental[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)], "innerHTML", '');
            domStyle.set(this._resultadoRiesgoAmbiental[arrayUtil.indexOf(this._matrices, this._matrizSeleccionadaString)], "backgroundColor", this._letraBackground('Inicial'));
        }
    });
    return widget;
});
