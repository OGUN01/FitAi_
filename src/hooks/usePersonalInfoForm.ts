import { useState, useEffect, useRef, useCallback } from "react";
import { PersonalInfoData, TabValidationResult } from "../types/onboarding";
import { COUNTRIES_WITH_STATES } from "../components/onboarding/PersonalInfoConstants";

interface UsePersonalInfoFormProps {
  data: PersonalInfoData | null;
  onUpdate: (data: Partial<PersonalInfoData>) => void;
  validationResult?: TabValidationResult;
}

export const usePersonalInfoForm = ({
  data,
  onUpdate,
  validationResult,
}: UsePersonalInfoFormProps) => {
  const [formData, setFormData] = useState<PersonalInfoData>({
    first_name: data?.first_name ?? "",
    last_name: data?.last_name ?? "",
    age: data?.age ?? 0,
    gender: data?.gender ?? "prefer_not_to_say",
    country: data?.country ?? "",
    state: data?.state ?? "",
    region: data?.region ?? "",
    wake_time: data?.wake_time ?? "07:00",
    sleep_time: data?.sleep_time ?? "23:00",
  });

  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [showCustomCountry, setShowCustomCountry] = useState(false);
  const [customCountry, setCustomCountry] = useState("");

  const [showWakeTimePicker, setShowWakeTimePicker] = useState(false);
  const [showSleepTimePicker, setShowSleepTimePicker] = useState(false);

  const isSyncingFromProps = useRef(false);

  useEffect(() => {
    if (data && !isSyncingFromProps.current) {
      const newFormData = {
        first_name: data.first_name ?? "",
        last_name: data.last_name ?? "",
        age: data.age ?? 0,
        gender: data.gender,
        country: data.country ?? "",
        state: data.state ?? "",
        region: data.region ?? "",
        wake_time: data.wake_time ?? "07:00",
        sleep_time: data.sleep_time ?? "23:00",
      };

      const hasChanged =
        formData.first_name !== newFormData.first_name ||
        formData.last_name !== newFormData.last_name ||
        formData.age !== newFormData.age ||
        formData.gender !== newFormData.gender ||
        formData.country !== newFormData.country ||
        formData.state !== newFormData.state ||
        formData.region !== newFormData.region ||
        formData.wake_time !== newFormData.wake_time ||
        formData.sleep_time !== newFormData.sleep_time;

      if (hasChanged) {
        isSyncingFromProps.current = true;
        setFormData(newFormData);
        setTimeout(() => {
          isSyncingFromProps.current = false;
        }, 0);
      }
    }
  }, [data]);

  useEffect(() => {
    const selectedCountry = COUNTRIES_WITH_STATES.find(
      (c) => c.name === formData.country,
    );
    if (selectedCountry) {
      setAvailableStates(selectedCountry.states);
      setShowCustomCountry(false);
    } else if (formData.country === "Other") {
      setAvailableStates([]);
      setShowCustomCountry(true);
    } else {
      setAvailableStates([]);
      setShowCustomCountry(false);
    }
  }, [formData.country]);

  const onUpdateMemo = useCallback(
    (data: Partial<PersonalInfoData>) => {
      onUpdate(data);
    },
    [onUpdate],
  );

  useEffect(() => {
    if (validationResult !== undefined) {
      const timer = setTimeout(() => {
        const finalData =
          showCustomCountry && customCountry
            ? { ...formData, country: customCountry }
            : formData;
        onUpdateMemo(finalData);
      }, 500);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [
    formData,
    showCustomCountry,
    customCountry,
    validationResult,
    onUpdateMemo,
  ]);

  const updateField = <K extends keyof PersonalInfoData>(
    field: K,
    value: PersonalInfoData[K],
  ) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      return newData;
    });
  };

  const handleCountryChange = (country: string) => {
    updateField("country", country);
    updateField("state", "");
    updateField("region", "");
  };

  const handleAgeChange = (ageText: string) => {
    if (ageText === "") {
      setFormData((prev) => ({ ...prev, age: 0 }));
      return;
    }
    const age = parseInt(ageText);
    if (!isNaN(age) && age >= 0) {
      setFormData((prev) => ({ ...prev, age }));
    }
  };

  const handleTimeChange = (
    field: "wake_time" | "sleep_time",
    time: string,
  ) => {
    updateField(field, time);
  };

  const calculateSleepDuration = (): string => {
    if (!formData.wake_time || !formData.sleep_time) return "";

    const [wakeHour, wakeMin] = formData.wake_time.split(":").map(Number);
    const [sleepHour, sleepMin] = formData.sleep_time.split(":").map(Number);

    const wakeMinutes = wakeHour * 60 + wakeMin;
    const sleepMinutes = sleepHour * 60 + sleepMin;

    let duration = wakeMinutes - sleepMinutes;
    if (duration <= 0) duration += 24 * 60;

    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;

    return `${hours}h ${minutes}m`;
  };

  const getFieldError = (fieldName: string): string | undefined => {
    return validationResult?.errors.find((error) =>
      error.toLowerCase().includes(fieldName.toLowerCase()),
    );
  };

  const hasFieldError = (fieldName: string): boolean => {
    return !!getFieldError(fieldName);
  };

  return {
    state: {
      formData,
      availableStates,
      showCustomCountry,
      customCountry,
      showWakeTimePicker,
      showSleepTimePicker,
    },
    actions: {
      updateField,
      setCustomCountry,
      handleCountryChange,
      handleAgeChange,
      handleTimeChange,
      setShowWakeTimePicker,
      setShowSleepTimePicker,
      getFieldError,
      hasFieldError,
      calculateSleepDuration,
    },
  };
};
