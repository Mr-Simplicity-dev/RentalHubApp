import { openPrivatePropertyFile } from "../../services/privatePropertyFileService";
import {
  savePendingPayment,
  getPendingPayment,
  clearPendingPayment,
} from "../../services/paymentRecoveryService";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Alert,
  AppState,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { launchCamera } from "react-native-image-picker";
import { AuthContext } from "../../context/AuthContext";
import api from "../../services/api";
import AppText from "../../components/common/AppText";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import SelectField from "../../components/common/SelectField";
import OptionPickerModal from "../../components/common/OptionPickerModal";
import useNativePaystackCheckout from "../../hooks/useNativePaystackCheckout";
import {
  actionSpec,
  actionsFor,
  fieldOptions,
  labels,
  valuesFor,
  viewsFor,
} from "../../propertyProtection/workflow.cjs";
import { translateUi as ui } from "../../i18n/interfaceRuntime.cjs";
import useInterfaceLanguage from "../../i18n/useInterfaceLanguage";
const base = "/property-protection",
  date = (value) => (value ? new Date(value).toLocaleDateString() : "—");
const errorMessage = (e) =>
  e.response?.data?.message ||
  e.message ||
  "This action could not be completed. Please try again.";
const Card = ({ title, children, translateTitle = true }) => (
  <View style={styles.card}>
    <AppText style={styles.section}>
      {translateTitle ? ui(title) : title}
    </AppText>
    {children}
  </View>
);
export default function PropertyProtectionScreen({ navigation, route }) {
  useInterfaceLanguage();
  const { user } = useContext(AuthContext),
    [selected, setSelected] = useState(
      route.params?.propertyId || route.params?.property || null,
    ),
    [view, setView] = useState(route.params?.view || "owner"),
    [rows, setRows] = useState([]),
    [hasMore, setHasMore] = useState(false),
    [data, setData] = useState(null),
    [forms, setForms] = useState({}),
    [locations, setLocations] = useState([]),
    [staff, setStaff] = useState([]),
    [services, setServices] = useState([]),
    [configuration, setConfiguration] = useState([]),
    [action, setAction] = useState(null),
    [values, setValues] = useState({}),
    [key, setKey] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [picker, setPicker] = useState(null),
    [asset, setAsset] = useState(null);
  useEffect(() => {
    const id = route.params?.propertyId || route.params?.property;
    if (id) setSelected(id);
    if (route.params?.view) setView(route.params.view);
  }, [route.params?.propertyId, route.params?.property, route.params?.view]);
  const epoch = useRef(0),
    keys = useRef({}),
    pending = useRef(null),
    identity = useRef(user?.id);
  identity.current = user?.id;
  const { openNativeCheckout, NativePaystackCheckoutModal } =
    useNativePaystackCheckout();
  const load = useCallback(async () => {
    const run = ++epoch.current;
    try {
      const r = await api.get(selected ? base + "/" + selected : base, {
        params: selected
          ? {}
          : {
              view,
            },
      });
      if (run !== epoch.current) return;
      if (selected) {
        setData(r.data.data);
        const s = await api.get(base + "/" + selected + "/services");
        if (run === epoch.current) setServices(s.data.data);
      } else {
        setRows(r.data.data);
        setHasMore(r.data.data.length === 200);
        setData(null);
      }
    } catch (e) {
      if (run === epoch.current) {
        setData(null);
        setError(errorMessage(e));
      }
    }
  }, [selected, view]);
  useEffect(() => {
    load();
    return () => {
      epoch.current++;
    };
  }, [load]);
  useEffect(() => {
    let active = true;
    Promise.all([
      api.get(base + "/forms"),
      api.get("/property-utils/location-options"),
    ])
      .then(([f, l]) => {
        if (active) {
          setForms(f.data.data);
          setLocations(l.data.data || []);
        }
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, []);
  const run = async (fn) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      return await fn();
    } catch (e) {
      setError(errorMessage(e));
      return null;
    } finally {
      setBusy(false);
    }
  };
  const more = () =>
    run(async () => {
      const current = epoch.current;
      const r = await api.get(base, {
        params: {
          view,
          before: rows.at(-1).id,
        },
      });
      if (current === epoch.current) {
        setRows((previous) => [...previous, ...r.data.data]);
        setHasMore(r.data.data.length === 200);
      }
    });
  const verify = async (id) =>
    run(async () => {
      await api.post(base + "/requests/" + id + "/verify");
      pending.current = null;
      keys.current = {};
      const saved = await getPendingPayment();
      if (saved?.flow === "property_protection" && saved.requestId === id)
        await clearPendingPayment();
      setNotice("Payment confirmed. Your request is saved.");
      await load();
    });
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && pending.current) verify(pending.current);
    });
    return () => sub.remove();
  }, [load, busy]);
  const open = (name) =>
    run(async () => {
      setKey((await api.get(base + "/key")).data.data.request_id);
      if (data?.permissions.operations)
        setStaff((await api.get(base + "/" + selected + "/staff")).data.data);
      if (name === "configureService")
        setConfiguration((await api.get(base + "/configuration")).data.data);
      setValues(
        name === "requestCorrection" ? valuesFor(forms[name], data) : {},
      );
      setAsset(null);
      setAction(name);
    });
  const change = (name, value) => {
    if (name === "code" && action === "configureService") {
      const c = configuration.find((x) => x.code === value);
      setValues({
        ...c,
        code: value,
        available_states: c?.available_states || [],
      });
    } else
      setValues((v) => ({
        ...v,
        [name]: value,
        ...(name === "state_id"
          ? {
              lga_name: "",
            }
          : {}),
      }));
  };
  const chooseFile = async (camera = false, video = false) => {
    try {
      if (camera) {
        const r = await launchCamera({
          mediaType: video ? "video" : "photo",
          quality: 0.85,
          videoQuality: "medium",
          durationLimit: 120,
          saveToPhotos: false,
        });
        if (r.didCancel) return;
        if (r.errorCode)
          throw Error(r.errorMessage || "Camera could not open.");
        const a = r.assets?.[0];
        if (a)
          setAsset({
            uri: a.uri,
            name: a.fileName || "inspection." + (video ? "mp4" : "jpg"),
            mimeType: a.type,
            size: a.fileSize,
          });
      } else {
        const r = await DocumentPicker.getDocumentAsync({
          type: ["application/pdf", "image/jpeg", "image/png", "video/mp4"],
          copyToCacheDirectory: true,
          multiple: false,
        });
        if (!r.canceled) setAsset(r.assets[0]);
      }
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  const submit = () =>
    run(async () => {
      const spec = actionSpec(action, selected, values, key);
      let body = spec.body,
        headers;
      if (action === "document") {
        if (!asset) throw Error("Choose an evidence file.");
        if (asset.size > 25 * 1024 * 1024)
          throw Error("The file must be 25 MB or smaller.");
        body = new FormData();
        Object.entries(spec.body).forEach(([k, v]) =>
          body.append(k, String(v)),
        );
        body.append("file", {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/octet-stream",
        });
        headers = {
          "Content-Type": "multipart/form-data",
        };
      }
      const response = await api.request({
        url: spec.url,
        method: spec.method,
        data: body,
        headers,
      });
      setAction(null);
      setNotice("Saved.");
      if (action === "register") setSelected(response.data.data.id);
      else await load();
    });
  const activeService = (code) =>
    data?.requests.find(
      (row) =>
        row.service_code === code &&
        ["pending_payment", "paid", "in_progress"].includes(row.status),
    );
  const pay = (s) =>
    Alert.alert(
      ui("Request service"),
      s.description + "\n\n₦" + Number(s.amount).toLocaleString(),
      [
        {
          text: ui("Cancel"),
          style: "cancel",
        },
        {
          text: ui("Continue"),
          onPress: () =>
            run(async () => {
              if (!keys.current[selected + ":" + s.code])
                keys.current[selected + ":" + s.code] = (
                  await api.get(base + "/key")
                ).data.data.request_id;
              const r = await api.post(base + "/" + selected + "/services", {
                service_code: s.code,
                request_id: keys.current[selected + ":" + s.code],
                consent: true,
              });
              const order = r.data.data;
              pending.current = order.id;
              await savePendingPayment({
                flow: "property_protection",
                reference: order.transaction_reference,
                requestId: order.id,
                propertyId: selected,
              });
              if (order.authorization_url)
                openNativeCheckout({
                  transaction: {
                    ...order,
                    reference: order.transaction_reference,
                  },
                  title: ui("Property Protection"),
                  amountLabel: "₦" + Number(order.amount).toLocaleString(),
                  onSuccess: () => verify(order.id),
                });
              else
                setNotice(
                  "The request is saved. Check payment status before paying again.",
                );
              await load();
            }),
        },
      ],
    );
  const resume = (id) =>
    run(async () => {
      const r = await api.post(base + "/requests/" + id + "/resume"),
        order = r.data.data;
      if (order.status !== "pending_payment") {
        await load();
        return;
      }
      pending.current = order.id;
      await savePendingPayment({
        flow: "property_protection",
        reference: order.transaction_reference,
        requestId: order.id,
        propertyId: selected,
      });
      if (order.authorization_url)
        openNativeCheckout({
          transaction: {
            ...order,
            reference: order.transaction_reference,
          },
          title: ui("Property Protection"),
          amountLabel: "₦" + Number(order.amount).toLocaleString(),
          onSuccess: () => verify(order.id),
        });
      else
        throw Error(
          "Checkout is not ready. The same payment reference remains saved.",
        );
    });
  const download = (doc) =>
    run(() =>
      openPrivatePropertyFile(base + "/documents/" + doc.id, {
        mimeType: doc.mime_type,
        name: doc.original_name,
      }),
    );
  const field = (f) => {
    const value = values[f.name] ?? "",
      options = fieldOptions(f, values, data, locations, staff).filter(
        (o) =>
          !(
            action === "representativeReview" &&
            f.name === "status" &&
            data?.permissions.owner &&
            !data?.permissions.operations
          ) || o.value === "revoked",
      );
    if (f.type === "checkbox")
      return (
        <View key={f.name} style={styles.switch}>
          <AppText
            style={{
              flex: 1,
            }}
          >
            {ui(f.label)}
            {f.required ? " *" : ""}
          </AppText>
          <Switch
            accessibilityLabel={ui(f.label)}
            value={Boolean(value)}
            onValueChange={(v) => change(f.name, v)}
          />
        </View>
      );
    if (f.type === "file")
      return (
        <View
          key={f.name}
          style={{
            gap: 8,
          }}
        >
          <AppText>{ui(f.label)}</AppText>
          <Button
            title={asset?.name || ui("Choose a file")}
            variant="outline"
            onPress={() => chooseFile()}
          />
          <Button
            title={ui("Take a photo")}
            variant="outline"
            onPress={() => chooseFile(true)}
          />
          <Button
            title={ui("Record a video")}
            variant="outline"
            onPress={() => chooseFile(true, true)}
          />
        </View>
      );
    if (
      [
        "select",
        "state",
        "lga",
        "staff",
        "document",
        "documents",
        "states",
        "case",
        "task",
        "alert",
      ].includes(f.type)
    )
      return (
        <SelectField
          key={f.name}
          label={ui(f.label) + (f.required ? " *" : "")}
          value={
            ["documents", "states"].includes(f.type)
              ? (value || [])
                  .map(
                    (id) =>
                      options.find((o) => String(o.value) === String(id))
                        ?.label,
                  )
                  .filter(Boolean)
                  .join(", ")
              : options.find((o) => String(o.value) === String(value))?.label
          }
          onPress={() =>
            setPicker({
              field: f,
              options,
            })
          }
        />
      );
    return (
      <Input
        key={f.name}
        label={ui(f.label) + (f.required ? " *" : "")}
        value={String(value)}
        onChangeText={(v) => change(f.name, v)}
        keyboardType={f.type === "number" ? "decimal-pad" : "default"}
        multiline={f.type === "textarea"}
        placeholder={
          f.type === "date"
            ? "YYYY-MM-DD"
            : f.type === "datetime-local"
              ? "YYYY-MM-DDTHH:mm"
              : undefined
        }
      />
    );
  };
  const valid =
    action &&
    forms[action]?.fields.every(
      (f) =>
        !f.required ||
        (f.type === "file"
          ? asset
          : f.type === "checkbox"
            ? values[f.name] === true
            : values[f.name] !== undefined &&
              String(values[f.name]).trim() !== ""),
    );
  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
      >
        <AppText style={styles.title}>
          {ui("Amana Property Protection")}
        </AppText>
        <AppText>
          {ui(
            "Basic property registration and case reporting are free. A platform check does not guarantee ownership or freeze an official land record.",
          )}
        </AppText>
        {error ? (
          <AppText accessibilityRole="alert" style={styles.error}>
            {ui(error)}
          </AppText>
        ) : null}
        {notice ? <AppText>{ui(notice)}</AppText> : null}
        {!selected ? (
          <>
            <View style={styles.row}>
              {viewsFor(user).map((v) => (
                <Button
                  key={v}
                  title={ui(labels(v))}
                  variant={view === v ? "primary" : "outline"}
                  onPress={() => setView(v)}
                />
              ))}
            </View>
            {actionsFor(null, user).map((a) => (
              <Button
                key={a}
                title={ui(forms[a]?.title || labels(a))}
                disabled={busy || !forms[a]}
                onPress={() => open(a)}
              />
            ))}
            {rows.map((p) => (
              <Card key={p.id} title={p.title} translateTitle={false}>
                <AppText>
                  {p.lga_name}, {p.state_name}
                </AppText>
                <AppText>
                  {ui(labels(p.verification_status))} · {date(p.created_at)}
                </AppText>
                <Button
                  title={ui("Open property")}
                  variant="outline"
                  onPress={() => setSelected(p.id)}
                />
              </Card>
            ))}
            {hasMore ? (
              <Button
                title={ui("Load more properties")}
                disabled={busy}
                onPress={more}
              />
            ) : null}
            {!rows.length ? (
              <AppText>{ui("No property records in this view.")}</AppText>
            ) : null}
          </>
        ) : data && String(data.property.id) === String(selected) ? (
          <>
            <Button
              title={ui("Back to properties")}
              variant="outline"
              onPress={() => setSelected(null)}
            />
            <Card title={data.property.title} translateTitle={false}>
              <AppText>{data.property.address}</AppText>
              <AppText>{ui(labels(data.property.verification_status))}</AppText>
              <AppText>
                {ui("Registered")}: {date(data.property.created_at)}
              </AppText>
              <AppText>
                {ui("Assigned case officer")}:{" "}
                {data.property.case_officer_name ||
                  data.property.case_officer_id ||
                  ui("Awaiting assignment")}
              </AppText>
              {data.property.verification_status === "verified_within_scope" &&
              data.property.verification_scope ? (
                <>
                  <AppText>{data.property.verification_scope}</AppText>
                  <AppText>{data.property.verification_limitations}</AppText>
                  <AppText>
                    {ui("Valid until")}: {date(data.property.verified_until)}
                  </AppText>
                </>
              ) : null}
            </Card>
            <Card title="Property actions">
              {data.property.pending_update ? (
                <>
                  <AppText>{ui("Record correction awaiting review")}</AppText>
                  <AppText>
                    {JSON.stringify(data.property.pending_update, null, 2)}
                  </AppText>
                  <AppText>{data.property.update_reason}</AppText>
                </>
              ) : null}
              {actionsFor(data, user).map((a) => (
                <Button
                  key={a}
                  title={ui(forms[a]?.title || labels(a))}
                  variant="outline"
                  disabled={busy || !forms[a]}
                  onPress={() => open(a)}
                />
              ))}
            </Card>
            <Card title="Verification progress">
              {data.checks.map((c) => (
                <View key={c.stage} style={styles.record}>
                  <AppText style={styles.bold}>
                    {ui(labels(c.stage))} — {ui(labels(c.status))}
                  </AppText>
                  <AppText>
                    {ui("Assigned reviewer")}:{" "}
                    {c.assigned_name || ui("Awaiting assignment")}
                  </AppText>
                  <AppText>
                    {c.public_summary || ui("This check is not complete.")}
                  </AppText>
                  {c.review_reason ? (
                    <AppText>{c.review_reason}</AppText>
                  ) : null}
                  {c.private_findings ? (
                    <AppText>
                      {ui("Confidential professional findings")}:{" "}
                      {c.private_findings}
                    </AppText>
                  ) : null}
                  {Object.entries(c.source_details || {})
                    .filter(([, v]) => typeof v === "string" && v)
                    .map(([k, v]) => (
                      <AppText key={k}>
                        {ui(labels(k))}: {v}
                      </AppText>
                    ))}
                  {c.history?.map((h, i) => (
                    <AppText key={i}>
                      {ui(labels(h.status))} —{" "}
                      {h.review_reason || h.public_summary}
                    </AppText>
                  ))}
                </View>
              ))}
            </Card>
            <Card title="Private evidence">
              <AppText>
                {ui(
                  "No single document proves ownership. Files require security scanning and permission to download.",
                )}
              </AppText>
              {data.documents.map((d) => (
                <Button
                  key={d.id}
                  title={d.original_name}
                  variant="outline"
                  disabled={busy}
                  onPress={() => download(d)}
                />
              ))}
            </Card>
            <Card title="Optional paid checks">
              {services.map((s) => (
                <View key={s.code} style={styles.record}>
                  <AppText style={styles.bold}>{ui(labels(s.code))}</AppText>
                  <AppText>{s.description}</AppText>
                  {s.code === "monitoring" && s.period_days ? (
                    <AppText>
                      {s.period_days} {ui("days; checks every")}{" "}
                      {s.cadence_days} {ui("days. Renewal is optional.")}
                    </AppText>
                  ) : null}
                  <Button
                    title={
                      activeService(s.code)
                        ? ui("Request already in progress")
                        : s.available
                          ? (s.code === "monitoring" && data.monitoring
                              ? ui("Renew monitoring")
                              : ui("Request")) +
                            (" \u2014 \u20A6" +
                              Number(s.amount).toLocaleString())
                          : ui("Not available for this location")
                    }
                    disabled={
                      busy ||
                      !s.available ||
                      (!data.permissions.owner &&
                        !data.permissions.can_request_services) ||
                      Boolean(activeService(s.code))
                    }
                    onPress={() => pay(s)}
                  />
                </View>
              ))}
            </Card>
            <Card title="Service requests and payments">
              {data.requests.map((r) => (
                <View key={r.id} style={styles.record}>
                  <AppText>
                    {ui(labels(r.service_code))} · ₦
                    {Number(r.amount).toLocaleString()} · {ui(labels(r.status))}
                  </AppText>
                  <AppText selectable>{r.id}</AppText>
                  {r.status === "pending_payment" ? (
                    <Button
                      title={ui("Check payment status")}
                      disabled={busy}
                      onPress={() => verify(r.id)}
                    />
                  ) : null}
                  {r.status === "pending_payment" &&
                  Number(r.user_id) === Number(user.id) ? (
                    <Button
                      title={ui("Resume checkout")}
                      disabled={busy}
                      variant="outline"
                      onPress={() => resume(r.id)}
                    />
                  ) : null}
                </View>
              ))}
            </Card>
            <Card title="Inspections">
              {data.inspections.map((i) => (
                <View key={i.id} style={styles.record}>
                  <AppText>
                    #{i.id} — {ui(labels(i.status))} — {date(i.scheduled_at)}
                  </AppText>
                  <AppText>{i.inspection_summary}</AppText>
                  {i.inspection_findings &&
                    [
                      "attendance",
                      "conditions",
                      "occupants",
                      "discrepancies",
                      "submitted_at",
                    ].map((k) => (
                      <AppText key={k}>
                        {ui(labels(k))}: {i.inspection_findings[k] || "—"}
                      </AppText>
                    ))}
                  <AppText>{i.supervisor_note}</AppText>
                </View>
              ))}
            </Card>
            <Card title="Monitoring">
              <AppText>
                {data.monitoring
                  ? data.monitoring.cancelled_at
                    ? ui("Stopped")
                    : ui("Active until") +
                      " " +
                      date(data.monitoring.active_until)
                  : ui("Not subscribed")}
              </AppText>
              {data.monitoring &&
              data.permissions.owner &&
              !data.monitoring.cancelled_at ? (
                <Button
                  title={ui("Stop future monitoring checks")}
                  disabled={busy}
                  onPress={() =>
                    run(async () => {
                      await api.patch(base + "/" + selected + "/monitoring", {
                        stopped: true,
                      });
                      await load();
                    })
                  }
                />
              ) : null}
            </Card>
            <Card title="Alerts for review">
              {data.alerts.map((a) => (
                <View key={a.id} style={styles.record}>
                  <AppText style={styles.bold}>
                    {ui(labels(a.category))} — {ui(labels(a.status))}
                  </AppText>
                  <AppText>{a.summary}</AppText>
                  <AppText>{a.review_note}</AppText>
                </View>
              ))}
            </Card>
            <Card title="Cases">
              <AppText>
                {ui(
                  "Messages and evidence stay in the existing case conversation. A closed case does not establish ownership.",
                )}
              </AppText>
              {data.cases.map((c) => (
                <Button
                  key={c.id}
                  title={
                    c.title +
                    " — " +
                    (c.assignment_required
                      ? ui("Assign case officer")
                      : ui(labels(c.status)))
                  }
                  variant="outline"
                  onPress={() =>
                    c.assignment_required
                      ? open("participant")
                      : navigation.navigate("DisputeDetails", {
                          disputeId: c.id,
                        })
                  }
                />
              ))}
            </Card>
            <Card title="Representative authority">
              {data.representatives.map((r) => (
                <View key={r.user_id} style={styles.record}>
                  <AppText>
                    {r.full_name} · #{r.user_id} · {ui(labels(r.status))} ·{" "}
                    {date(r.expires_at)}
                  </AppText>
                  <AppText>{r.authority_description}</AppText>
                </View>
              ))}
            </Card>
          </>
        ) : (
          <AppText>{ui("Loading property…")}</AppText>
        )}
        <>
          <>
            {data?.permissions.operations && (
              <Card title="Review history">
                {(data.operations || []).map((item) => (
                  <AppText key={item.id}>
                    {date(item.created_at)} — {item.actor_name || ui("Staff")} —{" "}
                    {ui(labels(item.action.replace("PROTECTION_", "")))}
                  </AppText>
                ))}
              </Card>
            )}
            {data?.property.record_history?.length > 0 && (
              <Card title="Record history">
                {data.property.record_history.map((item, index) => (
                  <AppText key={index}>
                    {date(item.reviewed_at)} — {item.reason}
                  </AppText>
                ))}
              </Card>
            )}
          </>
          <Button
            title={ui("Refresh")}
            disabled={busy}
            variant="outline"
            onPress={load}
          />
        </>
      </ScrollView>
      <Modal
        visible={Boolean(action)}
        animationType="slide"
        onRequestClose={() => {
          if (!busy) setAction(null);
        }}
      >
        <SafeAreaView style={styles.safe}>
          <ScrollView
            contentContainerStyle={styles.page}
            keyboardShouldPersistTaps="handled"
          >
            <AppText style={styles.title}>
              {ui(forms[action]?.title || "")}
            </AppText>
            <Button
              title={ui("Close")}
              variant="outline"
              disabled={busy}
              onPress={() => setAction(null)}
            />
            {error ? (
              <AppText accessibilityRole="alert" style={styles.error}>
                {ui(error)}
              </AppText>
            ) : null}
            {forms[action]?.fields.map(field)}
            <Button
              title={busy ? ui("Saving…") : ui("Save")}
              disabled={busy || !valid}
              onPress={submit}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <OptionPickerModal
        visible={Boolean(picker)}
        title={ui(picker?.field.label || "Choose")}
        searchable
        options={picker?.options || []}
        selectedValue={values[picker?.field.name]}
        onClose={() => setPicker(null)}
        onSelect={(option) => {
          const f = picker.field,
            v = option.value;
          if (["documents", "states"].includes(f.type)) {
            const current = values[f.name] || [];
            change(
              f.name,
              current.includes(v)
                ? current.filter((x) => x !== v)
                : [...current, v],
            );
          } else change(f.name, v);
          setPicker(null);
        }}
      />
      {NativePaystackCheckoutModal}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  page: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  title: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "700",
    color: "#0B2145",
  },
  section: {
    fontSize: 19,
    lineHeight: 26,
    fontWeight: "700",
    color: "#0B2145",
  },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  record: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 12,
    gap: 7,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  switch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bold: {
    fontWeight: "700",
  },
  error: {
    color: "#A42121",
    padding: 12,
    backgroundColor: "#FFF0F0",
    borderRadius: 10,
  },
});
