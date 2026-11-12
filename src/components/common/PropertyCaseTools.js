import React, { useContext, useEffect, useState } from "react";
import { View, Switch } from "react-native";
import { AuthContext } from "../../context/AuthContext";
import { useRealtime } from "../../context/RealtimeContext";
import api from "../../services/api";
import AppText from "./AppText";
import Button from "./Button";
import Input from "./Input";
import SelectField from "./SelectField";
import OptionPickerModal from "./OptionPickerModal";
import { translateUi as ui } from "../../i18n/interfaceRuntime.cjs";
export default function PropertyCaseTools({
  dispute,
  professional = false,
  onSaved,
  notes = []
}) {
  const {
      user
    } = useContext(AuthContext),
    realtime = useRealtime(),
    [people, setPeople] = useState([]),
    [meetings, setMeetings] = useState([]),
    [target, setTarget] = useState(null),
    [choose, setChoose] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [title, setTitle] = useState(""),
    [content, setContent] = useState(""),
    [visible, setVisible] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([api.get("/property-protection/cases/" + dispute.id + "/meeting-participants"), api.get("/property-protection/cases/" + dispute.id + "/meetings")]).then(([p, m]) => {
      if (active) {
        setPeople(p.data.data.filter(x => Number(x.id) !== Number(user.id)).map(x => ({
          value: x.id,
          label: x.full_name
        })));
        setMeetings(m.data.data);
      }
    }).catch(() => {
      if (active) setError("Case meeting details could not be loaded. Refresh to retry.");
    });
    return () => {
      active = false;
    };
  }, [dispute.id, user.id]);
  const call = async callType => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await realtime.inviteCall({
        receiverId: target.value,
        disputeId: dispute.id,
        callType
      });
      if (!r?.success) setError(r?.message || "The case meeting could not start.");
    } catch {
      setError("The case meeting could not start.");
    } finally {
      setBusy(false);
    }
  };
  return <View style={{
    padding: 16,
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDE4EF",
    backgroundColor: "#fff"
  }}>
      <AppText style={{
      fontSize: 19,
      fontWeight: "700"
    }}>
        {ui("Case meetings and review")}
      </AppText>
      <AppText>
        {ui("Only approved participants can join. Meeting times and status are saved. Conversations are not recorded.")}
      </AppText>
      {error ? <AppText accessibilityRole="alert" style={{
      color: "#A42121"
    }}>
          {ui(error)}
        </AppText> : null}
      <SelectField label={ui("Approved meeting participant")} value={target?.label} onPress={() => setChoose(true)} />
      {["audio", "video"].map(type => <Button key={type} title={ui(type === "audio" ? "Audio meeting" : "Video meeting")} variant="outline" disabled={busy || !target || dispute.is_legally_sealed || ["closed", "resolved"].includes(dispute.status)} onPress={() => call(type)} />)}
      <AppText>
        {ui("Meeting history")}: {meetings.length}
      </AppText>
      {meetings.map(m => <AppText key={m.id}>
          {ui(m.call_type)} · {ui(m.status)} ·{" "}
          {new Date(m.requested_at).toLocaleString()}
          {m.ended_at ? " — " + new Date(m.ended_at).toLocaleString() : ""}
        </AppText>)}
      {dispute.protection_outcome ? <>
          <AppText>
            {ui(dispute.protection_outcome.replaceAll("_", " "))}
          </AppText>
          <AppText>{dispute.resolution}</AppText>
          <AppText>{dispute.outcome_limitations}</AppText>
        </> : null}
      {notes.map(n => <View key={n.id} style={{
      gap: 6,
      paddingTop: 10
    }}>
          <AppText style={{
        fontWeight: "700"
      }}>{n.title}</AppText>
          <AppText>{n.content}</AppText>
          <AppText>
            {n.is_visible_to_client ? ui("Shared with record holder") : ui("Confidential professional findings")}
          </AppText>
        </View>)}
      {professional ? <>
          <AppText style={{
        fontWeight: "700"
      }}>
            {ui("Assigned professional assessment")}
          </AppText>
          <Input label={ui("Title")} value={title} onChangeText={setTitle} />
          <Input label={ui("Findings, missing evidence and limitations")} value={content} onChangeText={setContent} multiline />
          <View style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8
      }}>
            <AppText style={{
          flex: 1
        }}>
              {ui("Share this note with the record holder. Leave off for a confidential internal note.")}
            </AppText>
            <Switch value={visible} onValueChange={setVisible} />
          </View>
          <Button title={ui("Save assessment")} disabled={busy || !title.trim() || content.trim().length < 15} onPress={async () => {
        setBusy(true);
        setError("");
        try {
          await api.post("/legal/disputes/" + dispute.id + "/notes", {
            title,
            content,
            is_visible_to_client: visible
          });
          setTitle("");
          setContent("");
          setVisible(false);
          await onSaved?.();
        } catch (e) {
          setError(e.response?.data?.message || "The assessment could not be saved.");
        } finally {
          setBusy(false);
        }
      }} />
        </> : null}
      <OptionPickerModal visible={choose} title={ui("Approved meeting participant")} searchable options={people} onClose={() => setChoose(false)} onSelect={p => {
      setTarget(p);
      setChoose(false);
    }} />
    <View style={{
      gap: 8
    }}><AppText style={{
        fontWeight: '700'
      }}>{ui('Outcome history')}</AppText>{(dispute.protection_outcome_history || []).map((item, index) => <View key={index} style={{
        gap: 5
      }}><AppText>{new Date(item.recorded_at).toLocaleString()} — {ui(item.outcome.replaceAll('_', ' '))}</AppText><AppText>{item.summary}</AppText><AppText>{item.limitations}</AppText></View>)}</View></View>;
}
