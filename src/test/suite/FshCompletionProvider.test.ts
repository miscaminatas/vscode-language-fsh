import chai from 'chai';
import spies from 'chai-spies';
import { before, afterEach } from 'mocha';
import * as vscode from 'vscode';
import path from 'path';
import { EOL } from 'os';
import { FshCompletionProvider, PackageContents } from '../../FshCompletionProvider';

chai.use(spies);
const { assert, expect } = chai;

// Since the tests actually run from the build output directory,
// use this path to help find the FHIR caches we use.
const TEST_ROOT = path.join(__dirname, '..', '..', '..', 'src', 'test');

suite('FshCompletionProvider', () => {
  let extension: vscode.Extension<any>;
  let instance: FshCompletionProvider;

  before(() => {
    extension = vscode.extensions.getExtension('kmahalingam.vscode-language-fsh');
    instance = extension?.exports.completionProviderInstance as FshCompletionProvider;
  });

  suite('#constructor', () => {
    test('should be active in our workspace', () => {
      assert.exists(instance);
      assert.instanceOf(instance, FshCompletionProvider);
    });
  });

  suite('#getAllowedTypesAndExtraNames', () => {
    // for simplicity of cleanup, all test edits happen in codesystems.fsh
    afterEach(async () => {
      await vscode.window.showTextDocument(
        vscode.Uri.file(
          path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'codesystems.fsh')
        )
      );
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should return Profile, Resource, and Extension as allowed types when completing after InstanceOf', async () => {
      const filePath = path.join(
        vscode.workspace.workspaceFolders[0].uri.fsPath,
        'codesystems.fsh'
      );
      const doc = await vscode.workspace.openTextDocument(filePath);
      const fileChange = new vscode.WorkspaceEdit();
      fileChange.insert(
        vscode.Uri.file(filePath),
        new vscode.Position(78, 25),
        `${EOL}${EOL}Instance: NonsenseInstance${EOL}InstanceOf: `
      );
      await vscode.workspace.applyEdit(fileChange);
      const result = instance.getAllowedTypesAndExtraNames(doc, new vscode.Position(81, 12));
      assert.sameMembers(result.allowedTypes, ['Profile', 'Resource', 'Extension']);
      assert.lengthOf(result.extraNames, 0);
    });

    test('should return Invariant as the allowed type when completing an obeys rule with a path', async () => {
      const filePath = path.join(
        vscode.workspace.workspaceFolders[0].uri.fsPath,
        'codesystems.fsh'
      );
      const doc = await vscode.workspace.openTextDocument(filePath);
      const fileChange = new vscode.WorkspaceEdit();
      fileChange.insert(
        vscode.Uri.file(filePath),
        new vscode.Position(78, 25),
        `${EOL}${EOL}Profile: NonsenseObservation${EOL}Parent: Observation${EOL}* identifier obeys `
      );
      await vscode.workspace.applyEdit(fileChange);
      const result = instance.getAllowedTypesAndExtraNames(doc, new vscode.Position(82, 19));
      assert.sameMembers(result.allowedTypes, ['Invariant']);
      assert.lengthOf(result.extraNames, 0);
    });

    test('should return Invariant as the allowed type when completing an obeys rule with no path', async () => {
      const filePath = path.join(
        vscode.workspace.workspaceFolders[0].uri.fsPath,
        'codesystems.fsh'
      );
      const doc = await vscode.workspace.openTextDocument(filePath);
      const fileChange = new vscode.WorkspaceEdit();
      fileChange.insert(
        vscode.Uri.file(filePath),
        new vscode.Position(78, 25),
        `${EOL}${EOL}Profile: NonsenseObservation${EOL}Parent: Observation${EOL}* obeys `
      );
      await vscode.workspace.applyEdit(fileChange);
      const result = instance.getAllowedTypesAndExtraNames(doc, new vscode.Position(82, 8));
      assert.sameMembers(result.allowedTypes, ['Invariant']);
      assert.lengthOf(result.extraNames, 0);
    });

    test('should return Invariant as the allowed type when completing an obeys rule with a path and multiple invariants', async () => {
      const filePath = path.join(
        vscode.workspace.workspaceFolders[0].uri.fsPath,
        'codesystems.fsh'
      );
      const doc = await vscode.workspace.openTextDocument(filePath);
      const fileChange = new vscode.WorkspaceEdit();
      fileChange.insert(
        vscode.Uri.file(filePath),
        new vscode.Position(78, 25),
        `${EOL}${EOL}Profile: NonsenseObservation${EOL}Parent: Observation${EOL}* identifier obeys abc-1, `
      );
      await vscode.workspace.applyEdit(fileChange);
      const result = instance.getAllowedTypesAndExtraNames(doc, new vscode.Position(82, 26));
      assert.sameMembers(result.allowedTypes, ['Invariant']);
      assert.lengthOf(result.extraNames, 0);
    });

    test('should return Invariant as the allowed type when completing an obeys rule with no path and multiple invariants', async () => {
      const filePath = path.join(
        vscode.workspace.workspaceFolders[0].uri.fsPath,
        'codesystems.fsh'
      );
      const doc = await vscode.workspace.openTextDocument(filePath);
      const fileChange = new vscode.WorkspaceEdit();
      fileChange.insert(
        vscode.Uri.file(filePath),
        new vscode.Position(78, 25),
        `${EOL}${EOL}Profile: NonsenseObservation${EOL}Parent: Observation${EOL}* obeys xyz-2, `
      );
      await vscode.workspace.applyEdit(fileChange);
      const result = instance.getAllowedTypesAndExtraNames(doc, new vscode.Position(82, 15));
      assert.sameMembers(result.allowedTypes, ['Invariant']);
      assert.lengthOf(result.extraNames, 0);
    });

    test('should return Profile, Logical, Resource, and Extension as allowed types when completing Parent for a Profile', async () => {
      const filePath = path.join(
        vscode.workspace.workspaceFolders[0].uri.fsPath,
        'codesystems.fsh'
      );
      const doc = await vscode.workspace.openTextDocument(filePath);
      const fileChange = new vscode.WorkspaceEdit();
      fileChange.insert(
        vscode.Uri.file(filePath),
        new vscode.Position(78, 25),
        `${EOL}${EOL}Profile: NonsenseProfile${EOL}Parent: `
      );
      await vscode.workspace.applyEdit(fileChange);
      const result = instance.getAllowedTypesAndExtraNames(doc, new vscode.Position(81, 8));
      assert.sameMembers(result.allowedTypes, ['Profile', 'Logical', 'Resource', 'Extension']);
      assert.lengthOf(result.extraNames, 0);
    });

    test('should return Extension as the allowed type when completing Parent for an Extension', async () => {
      const filePath = path.join(
        vscode.workspace.workspaceFolders[0].uri.fsPath,
        'codesystems.fsh'
      );
      const doc = await vscode.workspace.openTextDocument(filePath);
      const fileChange = new vscode.WorkspaceEdit();
      fileChange.insert(
        vscode.Uri.file(filePath),
        new vscode.Position(78, 25),
        `${EOL}${EOL}Extension: NonsenseExtension${EOL}Parent: `
      );
      await vscode.workspace.applyEdit(fileChange);
      const result = instance.getAllowedTypesAndExtraNames(doc, new vscode.Position(81, 8));
      assert.sameMembers(result.allowedTypes, ['Extension']);
      assert.lengthOf(result.extraNames, 0);
    });

    test('should return Logical and Resource as allowed types and "Base" and "Element" as extra names when completing Parent for a Logical', async () => {
      const filePath = path.join(
        vscode.workspace.workspaceFolders[0].uri.fsPath,
        'codesystems.fsh'
      );
      const doc = await vscode.workspace.openTextDocument(filePath);
      const fileChange = new vscode.WorkspaceEdit();
      fileChange.insert(
        vscode.Uri.file(filePath),
        new vscode.Position(78, 25),
        `${EOL}${EOL}Logical: NonsenseLogical${EOL}Parent: `
      );
      await vscode.workspace.applyEdit(fileChange);
      const result = instance.getAllowedTypesAndExtraNames(doc, new vscode.Position(81, 8));
      assert.sameMembers(result.allowedTypes, ['Logical', 'Resource']);
      assert.sameDeepMembers(result.extraNames, [
        new vscode.CompletionItem('Base'),
        new vscode.CompletionItem('Element')
      ]);
    });

    test('should return no types and "Resource" and "DomainResource" as extra names when completing Parent for a Resource', async () => {
      const filePath = path.join(
        vscode.workspace.workspaceFolders[0].uri.fsPath,
        'codesystems.fsh'
      );
      const doc = await vscode.workspace.openTextDocument(filePath);
      const fileChange = new vscode.WorkspaceEdit();
      fileChange.insert(
        vscode.Uri.file(filePath),
        new vscode.Position(78, 25),
        `${EOL}${EOL}Resource: NonsenseResource${EOL}Parent: `
      );
      await vscode.workspace.applyEdit(fileChange);
      const result = instance.getAllowedTypesAndExtraNames(doc, new vscode.Position(81, 8));
      assert.lengthOf(result.allowedTypes, 0);
      assert.sameDeepMembers(result.extraNames, [
        new vscode.CompletionItem('Resource'),
        new vscode.CompletionItem('DomainResource')
      ]);
    });

    test('should return null when the current line starts with unsupported completion context', async () => {
      const filePath = path.join(
        vscode.workspace.workspaceFolders[0].uri.fsPath,
        'codesystems.fsh'
      );
      const doc = await vscode.workspace.openTextDocument(filePath);
      const fileChange = new vscode.WorkspaceEdit();
      fileChange.insert(
        vscode.Uri.file(filePath),
        new vscode.Position(78, 25),
        `${EOL}${EOL}Profile: NonsenseProfile${EOL}Title: `
      );
      await vscode.workspace.applyEdit(fileChange);
      const result = instance.getAllowedTypesAndExtraNames(doc, new vscode.Position(81, 7));
      assert.isNull(result);
    });

    test('should return null when completing Parent, but not for one of the supported entity types', async () => {
      // This case represents invalid FSH, such as:
      // CodeSystem: MySystem
      // Parent:
      // The FSH entities that can have a Parent are all supported.
      const filePath = path.join(
        vscode.workspace.workspaceFolders[0].uri.fsPath,
        'codesystems.fsh'
      );
      const doc = await vscode.workspace.openTextDocument(filePath);
      const fileChange = new vscode.WorkspaceEdit();
      fileChange.insert(
        vscode.Uri.file(filePath),
        new vscode.Position(78, 25),
        `${EOL}${EOL}CodeSystem: NonsenseCodes${EOL}Parent: `
      );
      await vscode.workspace.applyEdit(fileChange);
      const result = instance.getAllowedTypesAndExtraNames(doc, new vscode.Position(81, 8));
      assert.isNull(result);
    });
  });

  suite('#getEntityItems', () => {
    test('should return all CompletionItems that match the provided type when one type is provided', () => {
      const items = instance.getEntityItems(['Profile']);
      assert.lengthOf(items, 4);
      const observationItem = new vscode.CompletionItem('MyObservation');
      observationItem.detail = 'Profile';
      const patientItem = new vscode.CompletionItem('MyPatient');
      patientItem.detail = 'Profile';
      const reusedItem = new vscode.CompletionItem('ReusedName');
      reusedItem.detail = 'Profile, ValueSet';
      const specialItem = new vscode.CompletionItem('Extra_SpecialObservation');
      specialItem.detail = 'Profile';
      assert.includeDeepMembers(items, [observationItem, patientItem, reusedItem, specialItem]);
    });

    test('should return all CompletionItems that match at least one provided type when multiple types are provided', () => {
      const items = instance.getEntityItems(['Profile', 'Logical']);
      assert.lengthOf(items, 6);
      const observationItem = new vscode.CompletionItem('MyObservation');
      observationItem.detail = 'Profile';
      const patientItem = new vscode.CompletionItem('MyPatient');
      patientItem.detail = 'Profile';
      const reusedItem = new vscode.CompletionItem('ReusedName');
      reusedItem.detail = 'Profile, ValueSet';
      const specialItem = new vscode.CompletionItem('Extra_SpecialObservation');
      specialItem.detail = 'Profile';
      const employeeItem = new vscode.CompletionItem('Employee');
      employeeItem.detail = 'Logical';
      const ptItem = new vscode.CompletionItem('Employee-PT');
      ptItem.detail = 'Logical';
      assert.includeDeepMembers(items, [
        observationItem,
        patientItem,
        reusedItem,
        specialItem,
        employeeItem,
        ptItem
      ]);
    });
  });

  suite('#getFhirItems', () => {
    before(() => {
      // set up a small set of FHIR items
      const fhirResources = [new vscode.CompletionItem('Patient')];
      const fhirExtensions = [new vscode.CompletionItem('goal-reasonRejected')];
      const fhirCodeSystems = [new vscode.CompletionItem('composition-attestation-mode')];
      const fhirValueSets = [new vscode.CompletionItem('goal-start-event')];
      instance.fhirEntities = {
        resources: fhirResources,
        extensions: fhirExtensions,
        codeSystems: fhirCodeSystems,
        valueSets: fhirValueSets
      };
    });

    test('should return all CompletionItems that match the provided type when one type is provided', () => {
      const items = instance.getFhirItems(['Extension']);
      assert.lengthOf(items, 1);
      const extensionItem = new vscode.CompletionItem('goal-reasonRejected');
      assert.includeDeepMembers(items, [extensionItem]);
    });

    test('should return all CompletionItems that match at least one provided type when multiple types are provided', () => {
      const items = instance.getFhirItems(['Resource', 'CodeSystem', 'ValueSet']);
      assert.lengthOf(items, 3);
      const resourceItem = new vscode.CompletionItem('Patient');
      const codeSystemItem = new vscode.CompletionItem('composition-attestation-mode');
      const valueSetItem = new vscode.CompletionItem('goal-start-event');
      assert.includeDeepMembers(items, [resourceItem, codeSystemItem, valueSetItem]);
    });
  });

  suite('#updateFhirEntities', () => {
    afterEach(() => {
      chai.spy.restore();
    });

    test('should update from a package index when given a valid cache path', async () => {
      const processSpy = chai.spy.on(instance, 'processPackageContents');
      await instance.updateFhirEntities(path.join(TEST_ROOT, '.fhir'));
      expect(processSpy).to.have.been.called.exactly(1);
    });

    test('should update from a package index when given a valid path to the cache packages directory', async () => {
      const processSpy = chai.spy.on(instance, 'processPackageContents');
      await instance.updateFhirEntities(path.join(TEST_ROOT, '.fhir', 'packages'));
      expect(processSpy).to.have.been.called.exactly(1);
    });

    test('should update from a package index when given a valid path to the cache FHIR core directory', async () => {
      const processSpy = chai.spy.on(instance, 'processPackageContents');
      await instance.updateFhirEntities(
        path.join(TEST_ROOT, '.fhir', 'packages', 'hl7.fhir.r4.core#4.0.1')
      );
      expect(processSpy).to.have.been.called.exactly(1);
    });

    test('should update from a package index when given a valid path to the cache FHIR core package directory', async () => {
      const processSpy = chai.spy.on(instance, 'processPackageContents');
      await instance.updateFhirEntities(
        path.join(TEST_ROOT, '.fhir', 'packages', 'hl7.fhir.r4.core#4.0.1', 'package')
      );
      expect(processSpy).to.have.been.called.exactly(1);
    });

    test('should not update anything when the cache path is null', async () => {
      const processSpy = chai.spy.on(instance, 'processPackageContents');
      await instance.updateFhirEntities(null);
      expect(processSpy).to.have.been.called.exactly(0);
    });

    test('should throw an error when the cache path does not exist', async () => {
      const processSpy = chai.spy.on(instance, 'processPackageContents');
      try {
        await instance.updateFhirEntities(path.join(__dirname, 'nonsense', 'path'));
        assert.fail('updateFhirEntities should have thrown an error.');
      } catch (err) {
        assert.match(err, /Couldn't load FHIR definitions from path/);
      }
      expect(processSpy).to.have.been.called.exactly(0);
    });

    test('should throw an error when the cache path exists, but the package index is not found', async () => {
      const processSpy = chai.spy.on(instance, 'processPackageContents');
      try {
        await instance.updateFhirEntities(path.join(TEST_ROOT, '.fhir-no-index'));
        assert.fail('updateFhirEntities should have thrown an error.');
      } catch (err) {
        assert.match(err, /Couldn't read definition information from FHIR package/);
      }
      expect(processSpy).to.have.been.called.exactly(0);
    });

    test('should throw an error when the cache path exists, but the package index is not valid JSON', async () => {
      const processSpy = chai.spy.on(instance, 'processPackageContents');
      try {
        await instance.updateFhirEntities(path.join(TEST_ROOT, '.fhir-not-json'));
        assert.fail('updateFhirEntities should have thrown an error.');
      } catch (err) {
        assert.match(err, /Couldn't read definition information from FHIR package/);
      }
      expect(processSpy).to.have.been.called.exactly(0);
    });
  });

  suite('#processPackageContents', () => {
    test('should set the FHIR entities based on their attributes', () => {
      const packageIndex: PackageContents = {
        files: [
          {
            filename: 'ValueSet-some-value-set.json',
            resourceType: 'ValueSet',
            id: 'some-value-set',
            url: 'http://hl7.org/fhir/ValueSet/some-value-set'
          },
          {
            filename: 'SearchParameter-SomeInterestingResource-feature.json',
            resourceType: 'SearchParameter',
            id: 'SomeInterestingResource-feature',
            url: 'http://hl7.org/fhir/SearchParameter/SomeInterestingResource-feature',
            type: 'token'
          },
          {
            filename: 'CodeSystem-some-code-system.json',
            resourceType: 'CodeSystem',
            id: 'some-code-system',
            url: 'http://terminology.hl7.org/CodeSystem/some-code-system'
          },
          {
            filename: 'StructureDefinition-SomeInterestingResource.json',
            resourceType: 'StructureDefinition',
            id: 'SomeInterestingResource',
            url: 'http://hl7.org/fhir/StructureDefinition/SomeInterestingResource',
            kind: 'resource',
            type: 'SomeInterestingResource'
          },
          {
            filename: 'StructureDefinition-some-profile.json',
            resourceType: 'StructureDefinition',
            id: 'some-profile',
            url: 'http://hl7.org/fhir/StructureDefinition/some-profile',
            kind: 'resource',
            type: 'SomeInterestingResource'
          },
          {
            filename: 'StructureDefinition-useful-extension.json',
            resourceType: 'StructureDefinition',
            id: 'useful-extension',
            url: 'http://hl7.org/fhir/StructureDefinition/useful-extension',
            kind: 'complex-type',
            type: 'Extension'
          }
        ]
      };
      instance.processPackageContents(packageIndex);
      const expectedResource = new vscode.CompletionItem('SomeInterestingResource');
      expectedResource.detail = 'FHIR Resource';
      const expectedExtension = new vscode.CompletionItem('useful-extension');
      expectedExtension.detail = 'FHIR Extension';
      const expectedCodeSystem = new vscode.CompletionItem('some-code-system');
      expectedCodeSystem.detail = 'FHIR CodeSystem';
      const expectedValueSet = new vscode.CompletionItem('some-value-set');
      expectedValueSet.detail = 'FHIR ValueSet';
      assert.deepEqual(instance.fhirEntities, {
        resources: [expectedResource],
        extensions: [expectedExtension],
        codeSystems: [expectedCodeSystem],
        valueSets: [expectedValueSet]
      });
    });

    test('should not change the existing FHIR entities when no files are provided', () => {
      // set up a small set of FHIR items
      const fhirResources = [new vscode.CompletionItem('Patient')];
      const fhirExtensions = [new vscode.CompletionItem('goal-reasonRejected')];
      const fhirCodeSystems = [new vscode.CompletionItem('composition-attestation-mode')];
      const fhirValueSets = [new vscode.CompletionItem('goal-start-event')];
      instance.fhirEntities = {
        resources: fhirResources,
        extensions: fhirExtensions,
        codeSystems: fhirCodeSystems,
        valueSets: fhirValueSets
      };
      instance.processPackageContents({ files: [] });
      assert.deepEqual(instance.fhirEntities, {
        resources: fhirResources,
        extensions: fhirExtensions,
        codeSystems: fhirCodeSystems,
        valueSets: fhirValueSets
      });
    });
  });
});
