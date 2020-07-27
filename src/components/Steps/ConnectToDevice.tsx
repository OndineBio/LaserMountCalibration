import Autocomplete, {createFilterOptions} from "@material-ui/lab/Autocomplete";
import React, {FC, Fragment, useState} from "react";
import {Button, TextField} from "@material-ui/core";
import {createStyles, makeStyles, Theme} from "@material-ui/core/styles";

const filter = createFilterOptions<string>();
export const ConnectToDevice: FC<{
  // socket: Socket | null,
  openSocket: (ip: string) => Promise<void>;
  onDone: () => void;
  openLoader: () => void;
  closeLoader: () => void;
}> = ({onDone, openLoader, closeLoader, openSocket}) => {

  const IP_ADDR_STORAGE_KEY = "ConnectToDeviceStep_ip_addresses";
  const [ipAddress, setIpAddress] = useState<string>("");
  const getSavedOptions = (): string[] => {
    const ipAddressJson = localStorage.getItem(IP_ADDR_STORAGE_KEY);
    let savedIpAddresses = [];
    if (ipAddressJson) {
      savedIpAddresses = JSON.parse(ipAddressJson);
    }
    return savedIpAddresses as string[];
  };
  const [ipAddressOptions, setIpAddressOptions] = useState<string[]>(
    getSavedOptions()
  );
  const saveNewIpAddress = (ipAddr: string) => {
    if (!ipAddressOptions.includes(ipAddr)) {
      setIpAddressOptions((prev) => {
        const updated = [ipAddr, ...prev];
        localStorage.setItem(IP_ADDR_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    }
  };
  const [invalidIp, setInvalidIp] = useState(false);
  const isValidIp = (ipAddr: string): boolean =>
    /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ipAddr);

  return (
    <Fragment>
      <Autocomplete
        id="combo-box-demo"
        options={ipAddressOptions}
        noOptionsText={"Invalid IP address"}
        value={ipAddress === "" ? null : ipAddress}
        style={{width: 300}}
        onClose={() => {
          if (isValidIp(ipAddress) || ipAddress === "") {
            setInvalidIp(false);
          } else {
            setInvalidIp(true);
          }
        }}
        onChange={(event, newValue) => {

          if (typeof newValue === "string") {
            if (newValue.includes("Add")) {
              setIpAddress(newValue.replace(/Add "(.+)"/, "$1"));
              setInvalidIp(false);
              saveNewIpAddress(newValue.replace(/Add "(.+)"/, "$1"));
            } else {
              setIpAddress(newValue);
            }
          }
          // } else (newValue) {
          //   // Create a new value from the user input
          //   setIpAddress(newValue);
          // }
        }}
        filterOptions={(options, params) => {
          const filtered = filter(options, params);
          // Suggest the creation of a new value
          if (params.inputValue !== "") {
            if (isValidIp(params.inputValue)) {
              filtered.push(`Add "${params.inputValue}"`);
            }
          }
          return filtered;
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            error={invalidIp}
            onChange={(e) => {
              if (isValidIp(e.target.value) && e.target.value !== "") {
                setInvalidIp(false);
              } else {
                setInvalidIp(true);
              }
            }}
            helperText={invalidIp && "Invalid IP address"}
            label="Robot IP Address"
            variant="outlined"
          />
        )}
      />
      <br/>
      <Button
        disabled={!isValidIp(ipAddress)}
        onClick={async () => {
          openLoader();
          await openSocket(ipAddress)
          closeLoader();
          onDone();
        }}
        variant="outlined"
        color="primary"
      >
        Connect
      </Button>
    </Fragment>
  );
};
