import React from "react";
import { useEffect } from "react";
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import Chat from "./Chat";
import { signOut } from 'aws-amplify/auth';
import { getCurrentUser } from 'aws-amplify/auth';

function LayoutApp() {

  const [mobileLine,setMobileLine] = React.useState("");

  const effectRan = React.useRef(false);
  useEffect(() => {
    if (!effectRan.current) {
      console.log("effect applied - only on the FIRST mount");
        
      const fetchData = async () => {
        console.log("Hola");
        const { username, userId, signInDetails } = await getCurrentUser();
        console.log(`The username: ${username}`);
        console.log(`The userId: ${userId}`);
        console.log(signInDetails);
        setMobileLine(signInDetails.loginId)
      }
      fetchData()
          // catch any error
          .catch(console.error);
    }
  
    return () => effectRan.current = true;
  }, []);

  const defaultTheme = createTheme({
    palette: {
      primary: {
        main: "#4091AD",
        dark: "#2c6579",
        light: '#66a7bd'
      },
    }
  });

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      console.log('error signing out: ', error);
    }
  }

  return (

    <ThemeProvider theme={defaultTheme}>
    <GlobalStyles styles={{ ul: { margin: 0, padding: 0, listStyle: 'none' } }} />
    <CssBaseline />

    <AppBar
        position="static"
        color="default"
        elevation={0}
        sx={{ 
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
         }}
      >
        <Toolbar sx={{ flexWrap: 'wrap', p:1, m:0 }}>
          <Typography variant="h6" color="primary" noWrap sx={{ flexGrow: 1, p:0, m:0 }}>
            Video Games Sales Assistant
          </Typography>
          <Box sx={{ display: { xs: "none", sm: "inline"} }}>
              <Chip
                    sx={{ 
                      border: 0, fontSize: "0.95em"
                    }}
                    label={mobileLine.toUpperCase()}
                    variant="outlined"
                    icon={<SentimentSatisfiedAltIcon />}
              />
          </Box>
          <Button onClick={handleSignOut} sx={{ ml:1 }}>
          Sign Out
          </Button>
        </Toolbar>
      </AppBar>
      
      <Container disableGutters maxWidth="md" component="main" >
        <Chat/>
      </Container>
      
      <Box textAlign={"center"} >
        <Typography variant="body2" sx={{ pb: 1, fontSize: '0.875rem' }}>
            &copy;2024, Amazon Web Services, Inc. or its affiliates. All rights reserved.
        </Typography>
        <img src="/images/Powered-By_logo-horiz_RGB.png" alt="Powered By AWS" />
      </Box>

    </ThemeProvider>

  );
}

export default LayoutApp;