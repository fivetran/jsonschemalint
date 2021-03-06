'use strict';

var app = angular.module('app', false);

app.controller('validatorController', function ($scope, $http, $window) {
  var TEMPLATE =
      "{\n"+
      "  \"type\": \"object\",\n"+
      "  \"properties\": {\n"+
      "  }, \n"+
      "  \"additionalProperties\": false\n"+
      "}";
  var csv = $window['CSV'];
  var validator = $window['isMyJsonValid'];

  var self = this;

  self.schema = TEMPLATE;

  // Load the meta-schema
  $http.get('meta-schema/schema.json').success(function (data) {
    self.metaSchema = data;
  });

  this.reset = function() {
    self.document = "";
    self.schema = TEMPLATE;
  };

  this.sample = function(ref) {
    console.debug('sample', ref);

    $http.get('samples/' + ref + '.document.csv').success(function(data) {
      self.document = data
    });
    $http.get('samples/' + ref + '.schema.json').success(function(data) {
      self.schema = JSON.stringify(data, null, '  ');
    });

  };

  function parseCsv(input) {
    return new csv(input, { header: true, cast: false }).parse();
  }

  this.parseMarkup = function(thing) {
    try {
      return JSON.parse(thing);
    } catch (e) {
      console.log('not json, trying csv');

      return parseCsv(thing);
    }
  };

  this.reformatMarkup = function(thing) {
    try {
      return JSON.stringify(JSON.parse(thing), null, '  ');
    } catch (e) {
      return JSON.stringify(parseCsv(thing));
    }
  };

  this.formatDocument = function() {
    console.debug('formatDocument');

    try {
      var documentObject = this.parseMarkup(self.document);
      this.document = this.reformatMarkup(self.document);
    } catch (e) {
      console.log(e);
    }
  };

  this.formatSchema = function() {
    console.debug('formatSchema');

    try {
      var schemaObject = this.parseMarkup(self.schema);
      this.schema = this.reformatMarkup(self.schema);
    } catch (e) {
      console.log(e);
    }
  };

  this.validateDocument = function () {
    console.debug("document");
    self.documentErrors = [];
    self.documentMessage = "";

    // Parse as JSON
    try {
      self.documentObject = this.parseMarkup(self.document);
      var schema = { type: "array", items: this.schemaObject };
      // Do validation
      var documentValidator = validator(schema, {
        verbose: true
      });
      documentValidator(this.documentObject);
      console.log(documentValidator.errors)
      if (documentValidator.errors && documentValidator.errors.length) {
        this.documentErrors = documentValidator.errors;
      } else {
        this.documentMessage = "Document conforms to the JSON schema.";
      }
    } catch (e) {
      // Error parsing as JSON
      self.documentErrors = [{message: "Document is invalid JSON. Try http://jsonlint.com to fix it." }];
    }

    console.log("validateDocument");

  };

  this.validateSchema = function () {
    console.debug("schema");
    self.schemaErrors = [];
    self.schemaMessage = "";

    // Parse as JSON
    try {
      self.schemaObject = this.parseMarkup(self.schema);

      // Can't be done if we don't have the meta schema yet
      if (!this.metaSchema) {
        return;
      }

      // Do validation
      var schemaValidator = validator(this.metaSchema, {
        verbose: true
      });
      schemaValidator(this.schemaObject);
      console.log(schemaValidator.errors)
      if (schemaValidator.errors && schemaValidator.errors.length) {
        this.schemaErrors = schemaValidator.errors;
      } else {
        this.schemaMessage = "Schema is a valid JSON schema.";
      }
    } catch (e) {
      // Error parsing as JSON
      self.schemaErrors = [{ message: "Schema is invalid JSON. Try http://jsonlint.com to fix it." }];
    }

  };

  // Document changes
  $scope.$watch(function () {
    return self.document;
  }, function (newValue, oldValue) {
    self.validateDocument();
  });

  // Schema changes
  $scope.$watch(function () {
    return self.schema;
  }, function (newValue, oldValue) {
    self.validateSchema();
    self.validateDocument();
  });

});
