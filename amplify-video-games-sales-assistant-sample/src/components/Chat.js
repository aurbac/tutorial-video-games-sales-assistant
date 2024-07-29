import React, { useLayoutEffect, useRef, useEffect } from "react";
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import SendIcon from '@mui/icons-material/Send';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Unstable_Grid2';
import InputBase from '@mui/material/InputBase';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import QuestionAnswerRoundedIcon from '@mui/icons-material/QuestionAnswerRounded';

import { AGENT_ID, AGENT_ALIAS_ID } from '../env';
import { v4 as uuidv4 } from 'uuid';
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import {fromCognitoIdentityPool} from "@aws-sdk/credential-providers";
import { fetchAuthSession } from 'aws-amplify/auth';
import config from '../amplifyconfiguration.json';

const Chat = ({}) => {

    const [enabled,setEnabled] = React.useState(false);
    const [loading,setLoading] = React.useState(false);
    const [answers,setAnswers] = React.useState([]);
    const [query,setQuery] = React.useState("");
    const [sessionId,setSessionId] = React.useState(uuidv4());
    const [errorMessage,setErrorMessage] = React.useState("");
    const [height,setHeight] = React.useState(480);
    const [open, setOpen] = React.useState(false);
    const [fullWidth, setFullWidth] = React.useState(true);
    const [maxWidth, setMaxWidth] = React.useState('lg');
    const [size, setSize] = React.useState([0, 0]);
    const [selected, setSelected] = React.useState(0);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [answers]);

    useLayoutEffect(() => {
        function updateSize() {
            setSize([window.innerWidth, window.innerHeight]);
            const myh = window.innerHeight-216;
            if (myh<346){
                setHeight(346)
            }else{
                setHeight(myh)
            }
        }
        window.addEventListener('resize', updateSize);
        updateSize();
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    const effectRan = React.useRef(false);
    useEffect(() => {
      if (!effectRan.current) {
        console.log("effect applied - only on the FIRST mount");
          
        const fetchData = async () => {
            console.log("Chat")
        }
        fetchData()
            // catch any error
            .catch(console.error);
      }
      return () => effectRan.current = true;
    }, []);

    const handleQuery = (event) => {
        if (event.target.value.length>0 && loading===false && query!=="")
            setEnabled(true)
        else
            setEnabled(false)
        setQuery(event.target.value.replace("\n",""))
    }

    const handleKeyPress = (event) => {
        if (event.code === "Enter" && loading===false && query!==""){
            setAnswers(prevState => [...prevState, { query: query }]);
            getAnswer(query);
        }
    }

    const handleClick = async (e) => {
        e.preventDefault();
        if (query!=""){
            setAnswers(prevState => [...prevState, { query: query }]);
            getAnswer(query);
        }
    }

    const invokeBedrockAgent = async (prompt, sessionId) => {
        console.log(sessionId)
        const authToken = (await fetchAuthSession()).tokens?.idToken?.toString();
        const my_login = 'cognito-idp.'+config.aws_project_region+'.amazonaws.com/'+config.aws_user_pools_id
        const bedrock = new BedrockAgentRuntimeClient({ 
            region: config.aws_project_region,
            credentials: fromCognitoIdentityPool({
                clientConfig: { region: config.aws_project_region },
                identityPoolId: config.aws_cognito_identity_pool_id,
                logins: { [my_login]: authToken }
            })
        });
        const command = new InvokeAgentCommand({
            agentId: AGENT_ID,
            agentAliasId: AGENT_ALIAS_ID,
            sessionId,
            inputText: prompt,
        });
        let completion = "";        
        const response = await bedrock.send(command);
        if (response.completion === undefined) {
            throw new Error("Completion is undefined");
        }
        for await (let chunkEvent of response.completion) {
            const chunk = chunkEvent.chunk;
            //console.log(chunk);
            const decodedResponse = new TextDecoder("utf-8").decode(chunk.bytes);
            completion += decodedResponse;
        }
        return completion;  
    };
      
    function extractBetweenTags(string, tag) {
        const startTag = `<${tag}>`;
        const endTag = `</${tag}>`;
        const startIndex = string.indexOf(startTag) + startTag.length;
        const endIndex = string.indexOf(endTag, startIndex);
        if (startIndex === -1 || endIndex === -1) {
          return '';
        }
        return string.slice(startIndex, endIndex);
    }

    function removeCharFromStartAndEnd(str, charToRemove) {
        // Check if the string starts with the character
        while (str.startsWith(charToRemove)) {
          str = str.substring(1);
        }
        // Check if the string ends with the character
        while (str.endsWith(charToRemove)) {
          str = str.substring(0, str.length - 1);
        }
        return str;
    }

    const getAnswer = async (my_query) => {
        if (!loading && my_query!=""){
            setEnabled(false)
            setLoading(true)
            setErrorMessage("")
            setQuery("");
            try {
                const completion = await invokeBedrockAgent(my_query, sessionId)
                const json = {
                    rationale: removeCharFromStartAndEnd(extractBetweenTags(completion,'rationale'), '\n'),
                    queries: removeCharFromStartAndEnd(extractBetweenTags(completion,'queries'), '\n'),
                    text: removeCharFromStartAndEnd(extractBetweenTags(completion,'text'), '\n'),
                    summary: removeCharFromStartAndEnd(extractBetweenTags(completion,'summary'), '\n')
                }
                setLoading(false);
                setEnabled(true);
                setAnswers(prevState => [...prevState, json ]);
            } catch (error) {
                console.log('Call failed: ', error);
                setErrorMessage(error.toString());
                setLoading(false)
                setEnabled(true)
            }
        }
    }


    const handleClickOpen = (value) => () => {
        console.log(value);
        setSelected(value);
        setOpen(true);
    };
    
    const handleClose = () => {
        setOpen(false);
    };
    
    const handleMaxWidthChange = (event) => {
        setMaxWidth(
            // @ts-expect-error autofill of arbitrary value is not handled.
            event.target.value,
        );
    };
    
    const handleFullWidthChange = (event) => {
        setFullWidth(event.target.checked);
    };

    return (
    <Box sx={{ pl: 2, pr: 2, pt:0, pb:0 }}>

        { errorMessage!="" && (
            <Alert severity="error" sx={{ 
                position: "fixed",
                width: "80%",
                top: "65px",
                left: "20%",
                marginLeft: "-10%" /* Negative half of width. */
            }} onClose={() => { setErrorMessage("") }}>
            {errorMessage}</Alert>
        )}

        <Box
        id="chatHelper"
        sx={{
            display: "flex",
            flexDirection: "column",
            height: height,
            overflow: "hidden",
            overflowY: "scroll",
            }}
        >
            <Typography color="primary" sx={{ fontSize: "1.1em", pb: 2, pt:2 }}><strong>Welcome! I'm your AI assistant</strong>, here to help analyze sales data with commercial insights.</Typography>
            <Box sx={{ mb: 1 }} >
                <ul>
                {answers.map((answer, index) => (
                    <li key={"meg"+index}>
                    { answer.hasOwnProperty("text") ? (
                        
                        <Grid>
                            <Box sx={{ 
                                borderRadius: 4, 
                                pl: 1, pr: 1, pt: 1, 
                                display: 'flex',
                                alignItems: 'left'
                            }}>
                                <Box sx={{ pr: 2 }}>
                                    <img src="/images/genai.png" width={32} height={32} />
                                </Box>
                                <Box sx={{ p:0 }}>
                                    <Typography variant="body1">
                                    {
                                    answer.text.split("\n").map(function(item, idx) {
                                            return (
                                                <span key={idx}>
                                                    {item}
                                                    <br/>
                                                </span>
                                            )
                                        })
                                    }
                                    </Typography>
                                    <Button 
                                        size="small"
                                        onClick={handleClickOpen(index)} 
                                        tabIndex={-1}
                                        startIcon={<QuestionAnswerRoundedIcon />}>
                                        Details
                                    </Button>
                                </Box>
                            </Box>
                        </Grid>
                    ) : (
                        <Grid container justifyContent="flex-end" >  
                            <Box sx={{ fontSize: 15, textAlign: "right", borderRadius: 4, background: "#B2DFDB", fontWeight: 500, pt:1, pb:1, pl:2, pr: 2, mb: 1, mt: 2, mr:1 }}>
                                { answer.query }
                            </Box>
                        </Grid>
                    )}
                    </li>
                ))}
                    {/* this is the last item that scrolls into
                        view when the effect is run */}
                    <li ref={scrollRef} />
                </ul>
            </Box>
        </Box>

        <Paper
            component="form"
            sx={{ p: 1, mb: 2, display: 'flex', alignItems: 'center', borderRadius: 4 }}
            elevation={1}
            >

            <Box sx={{ pt:0.5 }}>
                { loading ? (
                    <CircularProgress size={32} />
                ) : (
                    <img src="/images/genai.png" width={32} height={32} />
                )}
            </Box>

            <InputBase
                required
                id="query"
                name="query"
                placeholder="Type your question..."
                fullWidth
                multiline
                onChange={handleQuery}
                onKeyDown={handleKeyPress}
                value={query}
                variant="outlined"
                inputProps={{ maxLength: 140 }}
                sx={{ pl: 2, pr:2, fontWeight: 500 }}
            />

            <Divider sx={{ height: 32 }} orientation="vertical" />
            <IconButton color="primary" sx={{ p: 1 }} aria-label="directions" disabled={!enabled} onClick={handleClick}>
                <SendIcon />
            </IconButton>
        </Paper>


    { selected>0 && (
        <Dialog
        fullWidth={fullWidth}
        maxWidth={maxWidth}
        open={open}
        onClose={handleClose}
        >
        <DialogTitle color={"primary"}>Question: {answers[selected-1].query}</DialogTitle>
        <DialogContent>
            <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
                <Grid sm={12} md={7} lg={8}>
                    <Box sx={{ pb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold" }} gutterBottom>Answer</Typography>
                    { answers[selected].text.split("\n").map(function(item, idx) {
                        return (
                            <span key={idx}>
                                {item}
                                <br/>
                            </span>
                        )
                    }) }
                    </Box>
                    <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold" }} gutterBottom>Summary</Typography>
                    { answers[selected].summary.split("\n").map(function(item, idx) {
                        return (
                            <span key={idx}>
                                {item}
                                <br/>
                            </span>
                        )
                    }) }
                    </Box>
                </Grid>
                <Grid sm={12} md={5} lg={4} >
                    <Box sx={{ borderRadius: 4, p:1.5, background: "#B2DFDB" }} >
                        <Box sx={{ pb: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: "bold" }} gutterBottom>Rationale for the SQL generation</Typography>
                        { answers[selected].rationale.split("\n").map(function(item, idx) {
                            return (
                                <span key={idx}>
                                    {item}
                                    <br/>
                                </span>
                            )
                        }) }
                        </Box>
                        <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: "bold" }} gutterBottom>SQL Queries</Typography>
                        { answers[selected].queries.split("\n").map(function(item, idx) {
                            return (
                                <span key={idx}>
                                    {item}
                                    <br/>
                                </span>
                            )
                        }) }
                        </Box>
                    </Box>
                </Grid>
            </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    )}
    </Box>
    );
};

export default Chat;