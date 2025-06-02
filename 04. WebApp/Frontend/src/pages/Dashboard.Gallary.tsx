import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getData } from "../api/NodeBackend";
import { AxiosError } from "axios";
import { ToastAlert } from "../components/ToastAlert";
import { useLoading } from "../context/LoadingContext";
import { fetchImage } from "../api/ImageBackend";

interface ImageCardProps {
  imageId: number;
  url: string;
  uploadedAt: string;
  node: string;
  blobUrl?: string;
}

interface ErrorResponse {
  error: string;
}

export default function Gallary() {
  const path = useLocation().pathname;
  const lotId = path.split("/")[5];
  const { user } = useAuth();
  const { setLoading } = useLoading();

  const [latestImages, setLatestImages] = useState<ImageCardProps[]>();
  const [btnLoading, setBtnLoading] = useState<boolean>(false);

  const getImages = async (lastId: number) => {
    setBtnLoading(true);
    const url = `lots/images/${user?.userId}/${lotId}/${lastId}`;
    console.log("Fetching early images: " + lotId + " lastId: " + lastId);

    try {
      const serverResponse = await getData(url);
      if (serverResponse.status === 200) {
        const { message, imageList } = serverResponse.data;
        console.log(message);

        // Map through images and fetch blob URLs
        const imagesWithBlobUrls: ImageCardProps[] = await Promise.all(
          imageList.map(async (image: ImageCardProps) => {
            const blobUrl = await fetchImage(image.url);
            return { ...image, blobUrl };
          })
        );

        setLatestImages((prev) =>
          lastId === -1
            ? imagesWithBlobUrls
            : [...(prev || []), ...imagesWithBlobUrls]
        );
      } else {
        console.log(serverResponse.statusText);
        ToastAlert({
          type: "warning",
          title: "No more images to load",
        });
      }
    } catch (err) {
      const error = err as AxiosError<ErrorResponse>;
      const status = error.response?.status;

      let errMsg;

      if (status === 400 || status === 404) {
        console.log(error.response?.data?.error);
        errMsg = error.response?.data?.error;
      }

      console.log("Dashboard Error:", errMsg);
      ToastAlert({
        type: "error",
        title: errMsg || "Something went wrong",
      });
    } finally {
      setBtnLoading(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setLoading(true);
      getImages(-1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleClick = () => {
    console.log("Fetching more images!");
    const len = latestImages?.length;
    const lastId = latestImages?.[len! - 1].imageId;
    if (lastId) {
      getImages(lastId);
    }
  };

  return (
    <Box width={"100%"}>
      <Typography
        fontFamily={"Montserrat"}
        variant="h5"
        fontWeight={600}
        noWrap
        mb={1}
      >
        Gallary
      </Typography>

      <Grid
        size={12}
        maxHeight={"calc(100vh - 250px)"}
        overflow={"auto"}
        container
        py={"10px"}
        display={"flex"}
        justifyContent={"space-around"}
      >
        {latestImages?.map((image) => (
          <Card
            key={image.imageId}
            elevation={3}
            sx={{
              p: 2,
              width: "320px",
              borderRadius: 2,
              fontFamily: "Montserrat",
              height: "200px",
              m: 1,
            }}
          >
            <CardMedia
              component="img"
              height="170"
              image={image.blobUrl || ""}
              alt={`image on ${image.uploadedAt}`}
            />
            <CardContent>
              <Typography
                textAlign={"center"}
                variant="body2"
                sx={{ color: "text.secondary" }}
              >
                Captured on: {image.uploadedAt}
              </Typography>
            </CardContent>
          </Card>
        ))}

        <Stack
          mt={2}
          width={"100%"}
          alignItems={"center"}
          justifyContent={"center"}
        >
          <Button
            variant="outlined"
            onClick={handleClick}
            disabled={btnLoading}
            color="success"
            sx={{
              fontFamily: "Montserrat",
              fontWeight: 600,
              width: "150px",
              border: "2px solid",
              borderRadius: 2,
            }}
          >
            {btnLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "View More"
            )}
          </Button>
        </Stack>
      </Grid>
    </Box>
  );
}
