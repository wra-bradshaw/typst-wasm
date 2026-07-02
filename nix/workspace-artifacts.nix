{ lib }:

artifacts:
lib.concatMapStringsSep "\n" (
  artifact:
  let
    outputPath = artifact.outputPath or "dist";
    targetPath = artifact.targetPath or "${artifact.packageDir}/${outputPath}";
  in
  ''
    mkdir -p ${targetPath}
    cp -R ${artifact.derivation}/${outputPath}/. ${targetPath}
  ''
) artifacts
