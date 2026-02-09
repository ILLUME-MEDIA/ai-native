import small1 from '@admin/assets/images/stock/small-1.jpg';
import small10 from '@admin/assets/images/stock/small-10.jpg';
import small2 from '@admin/assets/images/stock/small-2.jpg';
import small3 from '@admin/assets/images/stock/small-3.jpg';
import small8 from '@admin/assets/images/stock/small-8.jpg';
import small9 from '@admin/assets/images/stock/small-9.jpg';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Card, CardBody, CardHeader, CardTitle, Carousel, CarouselItem, Col, Row } from 'react-bootstrap';
const Page = () => {
  return <>
      <PageBreadcrumb title="Carousel" subtitle="UI" />
      <Row>
        <Col lg={6}>
          <SlidesOnly />
        </Col>
        <Col lg={6}>
          <SlidesWithControls />
        </Col>
        <Col lg={6}>
          <SlidesWithIndicators />
        </Col>
        <Col lg={6}>
          <SlidesWithCaptions />
        </Col>
        <Col lg={6}>
          <CrossFade />
        </Col>
        <Col lg={6}>
          <IndividualInterval />
        </Col>
        <Col lg={6}>
          <DarkVariant />
        </Col>
      </Row>
    </>;
};
export default Page;
const SlidesOnly = () => {
  return <Card>
      <CardHeader>
        <div className="flex-grow-1">
          <CardTitle as="h4" className="card-title">
            Slides Only
          </CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        <Carousel controls={false} indicators={false} id="carouselExampleSlidesOnly" className="carousel slide" data-bs-ride="carousel">
          <CarouselItem className="active">
            <img className="d-block img-fluid" src={small1} alt="First slide" />
          </CarouselItem>
          <CarouselItem>
            <img className="d-block img-fluid" src={small2} alt="Second slide" />
          </CarouselItem>
          <CarouselItem>
            <img className="d-block img-fluid" src={small3} alt="Third slide" />
          </CarouselItem>
        </Carousel>
      </CardBody>
    </Card>;
};
const SlidesWithControls = () => {
  return <Card>
      <CardHeader>
        <div className="flex-grow-1">
          <CardTitle as="h4" className="card-title">
            With Controls
          </CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        <Carousel indicators={false} id="carouselExampleControls" className="slide " data-bs-ride="carousel">
          <CarouselItem className="active">
            <img className="d-block img-fluid" src={small1} alt="First slide" />
          </CarouselItem>
          <CarouselItem>
            <img className="d-block img-fluid" src={small2} alt="Second slide" />
          </CarouselItem>
          <CarouselItem>
            <img className="d-block img-fluid" src={small3} alt="Third slide" />
          </CarouselItem>
        </Carousel>
      </CardBody>
    </Card>;
};
const SlidesWithIndicators = () => {
  return <Card>
      <CardHeader>
        <div className="flex-grow-1">
          <CardTitle as="h4" className="card-title">
            With Indicators
          </CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        <Carousel controls={true} indicators={true} id="carouselExampleControls">
          <CarouselItem className="active">
            <img className="d-block img-fluid" src={small1} alt="First slide" />
          </CarouselItem>
          <CarouselItem>
            <img className="d-block img-fluid" src={small2} alt="Second slide" />
          </CarouselItem>
          <CarouselItem>
            <img className="d-block img-fluid" src={small3} alt="Third slide" />
          </CarouselItem>
        </Carousel>
      </CardBody>
    </Card>;
};
const SlidesWithCaptions = () => {
  return <Card>
      <CardHeader>
        <div className="flex-grow-1">
          <CardTitle as="h4" className="card-title">
            With Captions
          </CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        <Carousel indicators={true} id="carouselExampleControls" className="slide ">
          <CarouselItem className="active">
            <img className="d-block img-fluid" src={small1} alt="First slide" />
            <div className="carousel-caption d-none d-md-block">
              <h3 className="text-white">First slide label</h3>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
          </CarouselItem>
          <CarouselItem>
            <img className="d-block img-fluid" src={small2} alt="Second slide" />
            <div className="carousel-caption d-none d-md-block">
              <h3 className="text-white">Second slide label</h3>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
          </CarouselItem>
          <CarouselItem>
            <img className="d-block img-fluid" src={small3} alt="Third slide" />
            <div className="carousel-caption d-none d-md-block">
              <h3 className="text-white">Third slide label</h3>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
          </CarouselItem>
        </Carousel>
      </CardBody>
    </Card>;
};
const CrossFade = () => {
  return <Card>
      <CardHeader>
        <div className="flex-grow-1">
          <CardTitle as="h4" className="card-title">
            Crossfade
          </CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        <Carousel indicators={false} id="carouselExampleFade" className="slide carousel-fade">
          <CarouselItem className="active">
            <img className="d-block img-fluid" src={small1} alt="First slide" />
          </CarouselItem>
          <CarouselItem>
            <img className="d-block img-fluid" src={small2} alt="Second slide" />
          </CarouselItem>
          <CarouselItem>
            <img className="d-block img-fluid" src={small3} alt="Third slide" />
          </CarouselItem>
        </Carousel>
      </CardBody>
    </Card>;
};
const IndividualInterval = () => {
  return <Card title="Individual Interval">
      <CardHeader>
        <div className="flex-grow-1">
          <CardTitle as="h4" className="card-title">
            Individual Interval
          </CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        <Carousel indicators={false} id="carouselExampleInterval" className="slide ">
          <CarouselItem className="active" data-bs-interval={1000}>
            <img className="img-fluid d-block w-100" src={small1} alt="First slide" />
          </CarouselItem>
          <CarouselItem data-bs-interval={2000}>
            <img className="img-fluid d-block w-100" src={small2} alt="Second slide" />
          </CarouselItem>
          <CarouselItem>
            <img className="img-fluid d-block w-100" src={small3} alt="Third slide" />
          </CarouselItem>
        </Carousel>
      </CardBody>
    </Card>;
};
const DarkVariant = () => {
  return <Card>
      <CardHeader>
        <div className="flex-grow-1">
          <CardTitle as="h4" className="card-title">
            Dark Variant
          </CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        <Carousel id="carouselExampleDark" data-bs-theme="dark" className="carousel-dark slide">
          <CarouselItem className="active" data-bs-interval={1000}>
            <img className="img-fluid" src={small8} alt="Images" />
            <div className="carousel-caption d-none d-md-block">
              <h5>First slide label</h5>
              <p>Some representative placeholder content for the first slide.</p>
            </div>
          </CarouselItem>
          <CarouselItem data-bs-interval={2000}>
            <img className="img-fluid" src={small9} alt="Images" />
            <div className="carousel-caption d-none d-md-block">
              <h5>Second slide label</h5>
              <p>Some representative placeholder content for the second slide.</p>
            </div>
          </CarouselItem>
          <CarouselItem>
            <img className="img-fluid" src={small10} alt="Images" />
            <div className="carousel-caption d-none d-md-block">
              <h5>Third slide label</h5>
              <p>Some representative placeholder content for the third slide.</p>
            </div>
          </CarouselItem>
        </Carousel>
      </CardBody>
    </Card>;
};