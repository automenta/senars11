; SeNARS MeTTa Visualization Demo
; This script generates a complex graph structure and outputs it for the IDE to render.

! (let $nodes
    (quote (
        {"id":"ROOT", "label":"Knowledge Base", "val":100, "type":"concept"}
        {"id":"N1", "label":"Reasoning", "val":80, "type":"task"}
        {"id":"N2", "label":"Learning", "val":80, "type":"task"}
        {"id":"N3", "label":"Memory", "val":80, "type":"task"}
        {"id":"C1", "label":"Narsese", "val":60}
        {"id":"C2", "label":"MeTTa", "val":60}
        {"id":"C3", "label":"Graphs", "val":60}
    ))
    (let $edges
      (quote (
        {"source":"ROOT", "target":"N1", "label":"contains"}
        {"source":"ROOT", "target":"N2", "label":"contains"}
        {"source":"ROOT", "target":"N3", "label":"contains"}
        {"source":"N1", "target":"C1", "label":"uses"}
        {"source":"N1", "target":"C2", "label":"uses"}
        {"source":"N3", "target":"C3", "label":"stores"}
        {"source":"C1", "target":"C2", "label":"interops"}
      ))
      (let $json
        (format-args "{}" "__VIZ__:graph:[{},{}]" $nodes $edges)
        $json
      )
    )
)

; Note: Since standard MeTTa doesn't have JSON stringify,
; we are faking it here by just outputting the string directly for the demo.
; In a real scenario, we'd construct this string dynamically or use a python extension.

! "__VIZ__:graph:[{\"id\":\"ROOT\",\"label\":\"Knowledge Base\",\"val\":100,\"type\":\"concept\"},{\"id\":\"N1\",\"label\":\"Reasoning\",\"val\":80,\"type\":\"task\"},{\"id\":\"N2\",\"label\":\"Learning\",\"val\":80,\"type\":\"task\"},{\"id\":\"N3\",\"label\":\"Memory\",\"val\":80,\"type\":\"task\"},{\"id\":\"C1\",\"label\":\"Narsese\",\"val\":60},{\"id\":\"C2\",\"label\":\"MeTTa\",\"val\":60},{\"id\":\"C3\",\"label\":\"Graphs\",\"val\":60},{\"source\":\"ROOT\",\"target\":\"N1\",\"label\":\"contains\"},{\"source\":\"ROOT\",\"target\":\"N2\",\"label\":\"contains\"},{\"source\":\"ROOT\",\"target\":\"N3\",\"label\":\"contains\"},{\"source\":\"N1\",\"target\":\"C1\",\"label\":\"uses\"},{\"source\":\"N1\",\"target\":\"C2\",\"label\":\"uses\"},{\"source\":\"N3\",\"target\":\"C3\",\"label\":\"stores\"},{\"source\":\"C1\",\"target\":\"C2\",\"label\":\"interops\"}]"
