import React, {Fragment} from 'react';
import {AppBar, Box, Container, Toolbar, Typography} from "@material-ui/core";
import {CalibrationSteps} from "./components/CalibrationSteps";

export default function App() {
  return <Fragment>
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" >
          Laser Mount Calibration
        </Typography>

      </Toolbar>
    </AppBar>
    <Container maxWidth="sm">
      <Box my={4}>
        <CalibrationSteps/>
      </Box>
    </Container>
  </Fragment>;
}
