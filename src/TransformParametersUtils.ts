import { ClipPrimitivePlanesProps, ClipPrimitiveShapeProps, ClipVectorProps } from "@itwin/core-geometry";
import { ClipData, LegacyView, PerModelCategoryData, PlaneProps, ShapeProps } from "./models/LegacyView";
import { TransformParameters, ViewModes } from "./models/FilterByViewDefinition";
import { CompressedId64Set, Id64Array } from "@itwin/core-bentley";
import { SubCategoryOverrideData } from "./models/ITwin3dView";
import { SavedView } from "./models/SavedView";
import { NewClipPrimitivePlaneProps, NewClipPrimitiveShapeProps } from "./models/ClipVectors";
import { EmphasizeElements } from "./models/EmphasizeElements";
import { EXTENSION_NAMES } from "./models/Extension";

export function parseSavedView(savedView: SavedView, viewMode: ViewModes): TransformParameters {
  // TODO: Check if perModelCategoryVisibility is mapped correctly
  return {
    categories: getListFromListOrCompressedId64Set(savedView.savedViewData.itwin3dView.categories?.enabled),
    models: getListFromListOrCompressedId64Set(savedView.savedViewData.itwin3dView.models?.enabled),
    neverDrawn: getNeverDrawnSavedView(savedView),
    alwaysDrawn: getAlwaysDrawnSavedView(savedView),
    isAlwaysDrawnExclusive: getIsAlwaysDrawnExclusive(savedView),
    subCategoryOvr: savedView.savedViewData.itwin3dView.displayStyle?.subCategoryOverrides,
    clip: tryGetClipData(savedView.savedViewData.itwin3dView.clipVectors),
    perModelCategoryVisibility: getExtensionValue<PerModelCategoryData[]>(savedView.extensions, "perModelCategoryVisibilityProps") ?? [],
    hiddenCategories: getListFromListOrCompressedId64Set(savedView.savedViewData.itwin3dView.categories?.disabled),
    hiddenModels: getListFromListOrCompressedId64Set(savedView.savedViewData.itwin3dView.models?.disabled),
    viewMode,
  };
}

export function parseLegacySavedView(legacyViewDefinition: LegacyView, viewMode: ViewModes): TransformParameters {
  return {
    categories: getListFromListOrCompressedId64Set(legacyViewDefinition.categorySelectorProps.categories),
    models: getListFromListOrCompressedId64Set(legacyViewDefinition.modelSelectorProps?.models),
    neverDrawn: legacyViewDefinition.emphasizeElementsProps?.neverDrawn,
    alwaysDrawn: legacyViewDefinition.emphasizeElementsProps?.alwaysDrawn,
    isAlwaysDrawnExclusive: legacyViewDefinition.emphasizeElementsProps?.isAlwaysDrawnExclusive,
    subCategoryOvr: legacyViewDefinition.displayStyleProps.jsonProperties?.styles?.subCategoryOvr as SubCategoryOverrideData[],
    clip: tryGetClipDataForLegacyView(legacyViewDefinition.viewDefinitionProps.jsonProperties?.viewDetails?.clip),
    perModelCategoryVisibility: legacyViewDefinition.perModelCategoryVisibility,
    hiddenCategories: getListFromListOrCompressedId64Set(legacyViewDefinition.hiddenCategories),
    hiddenModels: getListFromListOrCompressedId64Set(legacyViewDefinition.hiddenModels),
    viewMode,
  };
}

function getListFromListOrCompressedId64Set(ids?: string | Id64Array) {
  if (ids === undefined) {
    return [];
  }

  if (typeof ids === "string") {
    return CompressedId64Set.decompressArray(ids);
  }

  return ids;
}

function getExtensionValue<R>(extensions: { extensionName: string, data: string }[], extensionName: string): R | undefined {
  const data = extensions.find((x: { extensionName: string }) => x.extensionName === extensionName)?.data;

  return data ? JSON.parse(data) : undefined;
}

function getAlwaysDrawnSavedView(savedView: SavedView): Id64Array | undefined {
  return getExtensionValue<EmphasizeElements>(savedView.extensions, EXTENSION_NAMES.emphasizedElements)?.emphasizeElementsProps?.alwaysDrawn;
}

function getIsAlwaysDrawnExclusive(savedView: SavedView): boolean | undefined {
  return getExtensionValue<EmphasizeElements>(savedView.extensions, EXTENSION_NAMES.emphasizedElements)?.emphasizeElementsProps?.isAlwaysDrawnExclusive;
}

function getNeverDrawnSavedView(savedView: SavedView): Id64Array | undefined {
  return getExtensionValue<EmphasizeElements>(savedView.extensions, EXTENSION_NAMES.emphasizedElements)?.emphasizeElementsProps?.neverDrawn;
}

export function parseTransformParametersToJson(transformParameters: TransformParameters, includeEscapeCharacters?: boolean): string {
  const params = JSON.stringify(transformParameters);
  if (!includeEscapeCharacters)
    return params;

  return params.replace(/"/g, '\\"');
}

function tryGetClipDataForLegacyView(clipVectors: ClipVectorProps | undefined): ClipData | undefined {
  if (!clipVectors || !clipVectors.length)
    return undefined;

  const clipPlanes: PlaneProps[] = clipVectors
    .filter((primitive) => isPlanePrimitive(primitive))
    .map((primitive) => (primitive as ClipPrimitivePlanesProps).planes! as PlaneProps);

  const clipShapes: ShapeProps[] = clipVectors
    .filter((primitive) => isShapePrimitive(primitive))
    .map((primitive) => (primitive as ClipPrimitiveShapeProps).shape! as ShapeProps);

  return {
    shapes: clipShapes.length > 0 ? clipShapes : undefined,
    planes: clipPlanes.length > 0 ? clipPlanes : undefined,
  };
}

function tryGetClipData(_clipVectors: Array<NewClipPrimitivePlaneProps | NewClipPrimitiveShapeProps> | undefined): ClipData | undefined {
  // TODO: fix
  // if (!clipVectors || !clipVectors.length)
  //   return undefined;

  // const clipPlanes = clipVectors
  //   .map((primitive) => isNewPlanePrimitive(primitive) && changeDistanceToDistForClips(primitive.planes))
  //   .filter((primitive) => isNewPlanePrimitive(primitive));

  // const clipShapes = clipVectors
  //   .filter((primitive) => isNewShapePrimitive(primitive))
  //   .map((primitive) => (primitive as NewClipPrimitiveShapeProps).shape as unknown as ShapeProps);

  // return {
  //   shapes: clipShapes.length > 0 ? clipShapes : undefined,
  //   planes: clipPlanes.length > 0 ? clipPlanes : undefined,
  // };
  return;
}

function isPlanePrimitive(primitive: any): primitive is ClipPrimitivePlanesProps {
  return "planes" in primitive;
}

function isShapePrimitive(primitive: any): primitive is ClipPrimitiveShapeProps {
  return "shape" in primitive;
}
